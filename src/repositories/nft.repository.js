import { BigNumber } from 'bignumber.js'
import { decodeBlockNftTransfers, NFT_STANDARDS, ZERO_ADDRESS } from '../lib/nftTransfers'
import { contractsInterfaces } from '../lib/types'
import { chunkArray } from '../lib/utils'

const PRISMA_MAX_BIND_VALUES = 32767
const BALANCE_KEY_BIND_VALUES = 5
const underBindLimit = list => chunkArray(list, Math.floor(PRISMA_MAX_BIND_VALUES / BALANCE_KEY_BIND_VALUES))

const byKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0
const holderId = ({ contract, standard, holder }) => ({ contract, standard, holder })
const balanceId = ({ contract, standard, tokenId, holder }) => ({ contract, standard, tokenId, holder })

function netDeltas (facts, sign) {
  const balances = new Map()
  const holders = new Map()

  const touch = (contract, standard, holder) => {
    const key = `${contract}|${standard}|${holder}`
    if (holder !== ZERO_ADDRESS && !holders.has(key)) holders.set(key, { key, contract, standard, holder, quantityDelta: new BigNumber(0) })
  }
  const add = (contract, standard, tokenId, holder, delta) => {
    if (holder === ZERO_ADDRESS) return
    const key = `${contract}|${standard}|${holder}|${tokenId}`
    const row = balances.get(key) || { key, contract, standard, tokenId, holder, delta: new BigNumber(0) }
    row.delta = row.delta.plus(delta)
    balances.set(key, row)
  }

  for (const fact of facts) {
    const value = new BigNumber(fact.value.toString()).times(sign)
    touch(fact.contract, fact.standard, fact.to)
    touch(fact.contract, fact.standard, fact.from)
    add(fact.contract, fact.standard, fact.tokenId, fact.to, value)
    add(fact.contract, fact.standard, fact.tokenId, fact.from, value.negated())
  }

  const keys = [...balances.values()].filter(k => !k.delta.isZero()).sort(byKey)
  for (const k of keys.filter(k => k.standard === contractsInterfaces.ERC1155)) {
    const holder = holders.get(`${k.contract}|${k.standard}|${k.holder}`)
    holder.quantityDelta = holder.quantityDelta.plus(k.delta)
  }

  return { keys, holders: [...holders.values()].sort(byKey) }
}

export function getNftRepository (prismaClient) {
  function aggregateStatements (facts, sign, block = null) {
    const { keys, holders } = netDeltas(facts, sign)
    if (!holders.length) return []

    const statements = holders.map(h => {
      const where = { contract_standard_holder: holderId(h) }
      const update = { quantity: { increment: h.quantityDelta.toFixed() }, version: { increment: 1 } }
      return block
        ? prismaClient.nft_holder.upsert({ where, update, create: { ...holderId(h), quantity: h.quantityDelta.toFixed(), tokenCount: 0, lastBlockNumber: block.number, lastBlockHash: block.hash } })
        : prismaClient.nft_holder.update({ where, data: update })
    })

    if (block) {
      statements.push(...underBindLimit(holders).map(part => prismaClient.nft_holder.updateMany({
        where: { OR: part.map(holderId), lastBlockNumber: { lt: block.number } },
        data: { lastBlockNumber: block.number, lastBlockHash: block.hash }
      })))
    }

    for (const k of keys) {
      const step = k.delta.isPositive() ? 1 : -1
      const crossed = k.delta.isPositive() ? { gt: 0, lte: k.delta.toFixed() } : { gt: k.delta.toFixed(), lte: 0 }
      statements.push(
        prismaClient.nft_balance.upsert({
          where: { contract_standard_tokenId_holder: balanceId(k) },
          create: { ...balanceId(k), quantity: k.delta.toFixed() },
          update: { quantity: { increment: k.delta.toFixed() } }
        }),
        prismaClient.nft_holder.updateMany({
          where: { ...holderId(k), balances: { some: { tokenId: k.tokenId, quantity: crossed } } },
          data: k.standard === contractsInterfaces.ERC721
            ? { tokenCount: { increment: step }, quantity: { increment: step } }
            : { tokenCount: { increment: step } }
        })
      )
    }

    statements.push(...underBindLimit(keys).map(part => prismaClient.nft_balance.deleteMany({ where: { OR: part.map(k => ({ ...balanceId(k), quantity: 0 })) } })))

    return statements
  }

  async function latestOtherFact (holderRow, doomedHashes) {
    const probe = side => prismaClient.token_transfer.findFirst({
      where: { contract: holderRow.contract, standard: holderRow.standard, [side]: holderRow.holder, blockHash: { notIn: doomedHashes } },
      orderBy: { eventId: 'desc' },
      select: { blockNumber: true, blockHash: true }
    })
    const found = (await Promise.all([probe('to'), probe('from')])).filter(Boolean)

    return found.sort((a, b) => b.blockNumber - a.blockNumber)[0] || null
  }

  return {
    insertStatements (block, events) {
      const facts = decodeBlockNftTransfers(events)
      if (!facts.length) return []

      return [
        prismaClient.token_transfer.createMany({ data: facts }),
        ...aggregateStatements(facts, 1, block)
      ]
    },
    async undoStatements (blocks) {
      const doomedHashes = blocks.map(b => b.hash)
      const doomedFacts = { blockHash: { in: doomedHashes }, standard: { in: NFT_STANDARDS } }
      const facts = await prismaClient.token_transfer.findMany({ where: doomedFacts })
      if (!facts.length) return []

      const { holders } = netDeltas(facts, -1)
      const rows = (await Promise.all(underBindLimit(holders).map(part => prismaClient.nft_holder.findMany({
        where: { OR: part.map(holderId) },
        select: { contract: true, standard: true, holder: true, version: true, lastBlockHash: true }
      })))).flat()
      const doomed = new Set(doomedHashes)
      const repairs = []
      const removals = []

      for (const row of rows.filter(r => doomed.has(r.lastBlockHash)).map(r => ({ ...r, key: `${r.contract}|${r.standard}|${r.holder}` })).sort(byKey)) {
        const latest = await latestOtherFact(row, doomedHashes)
        const where = { contract_standard_holder: holderId(row), version: row.version }

        if (latest) {
          repairs.push(prismaClient.nft_holder.update({ where, data: { lastBlockNumber: latest.blockNumber, lastBlockHash: latest.blockHash } }))
        } else {
          repairs.push(prismaClient.nft_holder.update({ where, data: { version: { increment: 1 } } }))
          removals.push(prismaClient.nft_holder.delete({ where: { contract_standard_holder: holderId(row), quantity: 0, tokenCount: 0 } }))
        }
      }

      return [
        ...repairs,
        prismaClient.token_transfer.deleteMany({ where: doomedFacts }),
        ...aggregateStatements(facts, -1),
        ...removals
      ]
    }
  }
}

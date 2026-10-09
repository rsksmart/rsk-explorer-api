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
const holderKey = ({ contract, standard, holder }) => `${contract}|${standard}|${holder}`
const balanceKey = ({ contract, standard, tokenId, holder }) => `${contract}|${standard}|${holder}|${tokenId}`
const isPositive = quantity => quantity.gt(0) ? 1 : 0

function netDeltas (signedFacts) {
  const balances = new Map()
  const holders = new Map()

  const touch = (contract, standard, holder, added) => {
    if (holder === ZERO_ADDRESS) return
    const key = holderKey({ contract, standard, holder })
    const row = holders.get(key) || { key, contract, standard, holder, added: false }
    row.added = row.added || added
    holders.set(key, row)
  }
  const add = (contract, standard, tokenId, holder, delta) => {
    if (holder === ZERO_ADDRESS) return
    const key = balanceKey({ contract, standard, tokenId, holder })
    const row = balances.get(key) || { key, contract, standard, tokenId, holder, delta: new BigNumber(0) }
    row.delta = row.delta.plus(delta)
    balances.set(key, row)
  }

  for (const [facts, sign] of signedFacts) {
    for (const fact of facts) {
      const value = new BigNumber(fact.value.toString()).times(sign)
      touch(fact.contract, fact.standard, fact.to, sign > 0)
      touch(fact.contract, fact.standard, fact.from, sign > 0)
      add(fact.contract, fact.standard, fact.tokenId, fact.to, value)
      add(fact.contract, fact.standard, fact.tokenId, fact.from, value.negated())
    }
  }

  return { keys: [...balances.values()].filter(k => !k.delta.isZero()).sort(byKey), holders: [...holders.values()].sort(byKey) }
}

export function getNftRepository (prismaClient) {
  async function readHoldersThenBalances (holders, keys) {
    const holderRows = (await Promise.all(underBindLimit(holders).map(part => prismaClient.nft_holder.findMany({ where: { OR: part.map(holderId) } })))).flat()
    const balanceRows = (await Promise.all(underBindLimit(keys).map(part => prismaClient.nft_balance.findMany({ where: { OR: part.map(balanceId) } })))).flat()

    return {
      holders: new Map(holderRows.map(row => [holderKey(row), row])),
      balances: new Map(balanceRows.map(row => [balanceKey(row), new BigNumber(row.quantity.toFixed())]))
    }
  }

  async function latestOtherFact (holderRow, doomedHashes) {
    const probe = side => prismaClient.token_transfer.findFirst({
      where: { contract: holderRow.contract, standard: holderRow.standard, [side]: holderRow.holder, blockHash: { notIn: doomedHashes } },
      orderBy: { eventId: 'desc' },
      select: { blockNumber: true, blockHash: true }
    })
    const found = (await Promise.all([probe('to'), probe('from')])).filter(Boolean)
    const latest = found.sort((a, b) => b.blockNumber - a.blockNumber)[0]

    return latest ? { lastBlockNumber: latest.blockNumber, lastBlockHash: latest.blockHash } : null
  }

  async function latestOtherFacts (holderRows, doomedHashes) {
    const latest = new Map()
    for (const row of holderRows) {
      const found = await latestOtherFact(row, doomedHashes)
      if (found) latest.set(holderKey(row), found)
    }
    return latest
  }

  async function ownershipStatements ({ added, undone, block, doomedHashes }) {
    const { keys, holders } = netDeltas([[added, 1], [undone, -1]])
    if (!holders.length) return []

    const current = await readHoldersThenBalances(holders, keys)
    const doomed = new Set(doomedHashes)
    const latest = await latestOtherFacts(holders.map(h => current.holders.get(h.key)).filter(row => row && doomed.has(row.lastBlockHash)), doomedHashes)

    const holderDeltas = new Map(holders.map(h => [h.key, { quantity: new BigNumber(0), tokenCount: 0 }]))
    const appearing = []
    const vanishing = []
    const changing = new Map()

    for (const k of keys) {
      const before = current.balances.get(k.key)
      const after = (before || new BigNumber(0)).plus(k.delta)
      const crossed = isPositive(after) - (before ? isPositive(before) : 0)
      const delta = holderDeltas.get(holderKey(k))
      delta.tokenCount += crossed
      delta.quantity = delta.quantity.plus(k.standard === contractsInterfaces.ERC721 ? crossed : k.delta)

      if (!before) appearing.push({ ...balanceId(k), quantity: after.toFixed() })
      else if (after.isZero()) vanishing.push(k)
      else {
        const quantity = after.toFixed()
        if (!changing.has(quantity)) changing.set(quantity, [])
        changing.get(quantity).push(k)
      }
    }

    const created = []
    const updates = []
    const removals = []

    for (const h of holders) {
      const row = current.holders.get(h.key)
      const delta = holderDeltas.get(h.key)
      const own = h.added ? { lastBlockNumber: block.number, lastBlockHash: block.hash } : null

      if (!row) {
        created.push({ ...holderId(h), quantity: delta.quantity.toFixed(), tokenCount: delta.tokenCount, ...own, version: 1 })
        continue
      }

      let lastBlock = {}
      if (doomed.has(row.lastBlockHash)) {
        lastBlock = [latest.get(h.key), own].filter(Boolean).sort((a, b) => b.lastBlockNumber - a.lastBlockNumber)[0] || {}
        if (!lastBlock.lastBlockHash) removals.push(prismaClient.nft_holder.delete({ where: { contract_standard_holder: holderId(h), quantity: 0, tokenCount: 0 } }))
      } else if (own && row.lastBlockNumber < own.lastBlockNumber) {
        lastBlock = own
      }

      updates.push(prismaClient.nft_holder.update({
        where: { contract_standard_holder: holderId(h), version: row.version },
        data: { quantity: { increment: delta.quantity.toFixed() }, tokenCount: { increment: delta.tokenCount }, version: { increment: 1 }, ...lastBlock }
      }))
    }

    return [
      ...(created.length ? [prismaClient.nft_holder.createMany({ data: created })] : []),
      ...updates,
      ...(appearing.length ? [prismaClient.nft_balance.createMany({ data: appearing })] : []),
      ...underBindLimit(vanishing).map(part => prismaClient.nft_balance.deleteMany({ where: { OR: part.map(balanceId) } })),
      ...[...changing].flatMap(([quantity, part]) => underBindLimit(part).map(chunk => prismaClient.nft_balance.updateMany({ where: { OR: chunk.map(balanceId) }, data: { quantity } }))),
      ...removals
    ]
  }

  async function statements ({ blocks = [], block = null, events = [] }) {
    const doomedHashes = blocks.map(b => b.hash)
    const doomedFacts = { blockHash: { in: doomedHashes }, standard: { in: NFT_STANDARDS } }
    const undone = blocks.length ? await prismaClient.token_transfer.findMany({ where: doomedFacts }) : []
    const added = block ? decodeBlockNftTransfers(events) : []
    const ownership = await ownershipStatements({ added, undone, block, doomedHashes })
    const undoFacts = undone.length ? [prismaClient.token_transfer.deleteMany({ where: doomedFacts })] : []
    const insertFacts = added.length ? [prismaClient.token_transfer.createMany({ data: added })] : []

    return blocks.length
      ? { undo: [...undoFacts, ...ownership], insert: insertFacts }
      : { undo: [], insert: [...insertFacts, ...ownership] }
  }

  return {
    async insertStatements (block, events) {
      return (await statements({ block, events })).insert
    },
    async undoStatements (blocks) {
      return (await statements({ blocks })).undo
    },
    replaceStatements (blocks, block, events) {
      return statements({ blocks, block, events })
    }
  }
}

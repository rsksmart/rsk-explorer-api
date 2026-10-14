import { BigNumber } from 'bignumber.js'
import { decodeBlockNftTransfers, NFT_STANDARDS, ZERO_ADDRESS } from '../lib/nftTransfers'
import { contractsInterfaces } from '../lib/types'
import { chunkArray } from '../lib/utils'

const PRISMA_MAX_BIND_VALUES = 32767
const BINDS_LEFT_FOR_A_FIND_OFFSET_OR_AN_UPDATED_VALUE = PRISMA_MAX_BIND_VALUES - 1
const OR_ARMS_POSTGRES_STILL_PLANS_IN_LINEAR_TIME = 400

const byKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0
const holderId = ({ contract, standard, holder }) => ({ contract, standard, holder })
const balanceId = ({ contract, standard, tokenId, holder }) => ({ contract, standard, tokenId, holder })

function inListsUnderBindLimit (sortedRows, prefix, listed, bindsTakenByTheRestOfTheWhere = 0) {
  const parts = []
  let part = []
  let binds = 0
  let group = null
  const sharesPrefix = row => !!group && prefix.every(field => group[field] === row[field])

  for (const row of sortedRows) {
    const opensAnArm = !sharesPrefix(row)
    const overBindLimit = bindsTakenByTheRestOfTheWhere + binds + (opensAnArm ? prefix.length + 1 : 1) > BINDS_LEFT_FOR_A_FIND_OFFSET_OR_AN_UPDATED_VALUE
    if (overBindLimit || (opensAnArm && part.length === OR_ARMS_POSTGRES_STILL_PLANS_IN_LINEAR_TIME)) {
      parts.push(part)
      part = []
      binds = 0
      group = null
    }
    if (!sharesPrefix(row)) {
      group = { ...Object.fromEntries(prefix.map(field => [field, row[field]])), [listed]: { in: [] } }
      part.push(group)
      binds += prefix.length
    }
    group[listed].in.push(row[listed])
    binds++
  }

  return part.length ? [...parts, part] : parts
}

const holdersUnderBindLimit = sortedHolders => inListsUnderBindLimit(sortedHolders, ['contract', 'standard'], 'holder')
const balancesUnderBindLimit = sortedKeys => inListsUnderBindLimit(sortedKeys, ['contract', 'standard', 'holder'], 'tokenId')
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
    const holderRows = (await Promise.all(holdersUnderBindLimit(holders).map(part => prismaClient.nft_holder.findMany({ where: { OR: part } })))).flat()
    const balanceRows = (await Promise.all(balancesUnderBindLimit(keys).map(part => prismaClient.nft_balance.findMany({ where: { OR: part } })))).flat()

    return {
      holders: new Map(holderRows.map(row => [holderKey(row), row])),
      balances: new Map(balanceRows.map(row => [balanceKey(row), new BigNumber(row.quantity.toFixed())]))
    }
  }

  async function latestOtherFacts (sortedHolderRows, doomedHashes) {
    const maxima = await Promise.all(['to', 'from'].flatMap(side => inListsUnderBindLimit(sortedHolderRows, ['contract', 'standard'], 'holder', doomedHashes.length).map(async part => {
      const groups = await prismaClient.token_transfer.groupBy({
        by: ['contract', 'standard', side],
        where: { OR: part.map(({ holder, ...contractAndStandard }) => ({ ...contractAndStandard, [side]: holder })), blockHash: { notIn: doomedHashes } },
        _max: { blockNumber: true }
      })
      return groups.map(row => [holderKey({ contract: row.contract, standard: row.standard, holder: row[side] }), row._max.blockNumber])
    })))

    const latestNumber = new Map()
    for (const [key, number] of maxima.flat()) {
      if (!latestNumber.has(key) || number > latestNumber.get(key)) latestNumber.set(key, number)
    }
    const numbers = [...new Set(latestNumber.values())]
    const blocks = (await Promise.all(chunkArray(numbers, BINDS_LEFT_FOR_A_FIND_OFFSET_OR_AN_UPDATED_VALUE).map(part => prismaClient.block.findMany({ where: { number: { in: part } }, select: { number: true, hash: true } })))).flat()
    const hashAt = new Map(blocks.map(({ number, hash }) => [number, hash]))

    return new Map([...latestNumber].map(([key, number]) => [key, { lastBlockNumber: number, lastBlockHash: hashAt.get(number) }]))
  }

  async function ownershipStatements ({ added, undone, block, doomedHashes }) {
    const { keys, holders } = netDeltas([[added, 1], [undone, -1]])
    if (!holders.length) return []

    const current = await readHoldersThenBalances(holders, keys)
    const removedSinceTheFactsWereRead = new Set(holders.filter(h => !h.added && !current.holders.has(h.key)).map(h => h.key))
    const doomed = new Set(doomedHashes)
    const latest = await latestOtherFacts(holders.map(h => current.holders.get(h.key)).filter(row => row && doomed.has(row.lastBlockHash)), doomedHashes)

    const holderDeltas = new Map(holders.map(h => [h.key, { quantity: new BigNumber(0), tokenCount: 0 }]))
    const appearing = []
    const vanishing = []
    const changing = new Map()

    for (const k of keys.filter(k => !removedSinceTheFactsWereRead.has(holderKey(k)))) {
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

    for (const h of holders.filter(h => !removedSinceTheFactsWereRead.has(h.key))) {
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
      ...balancesUnderBindLimit(vanishing).map(part => prismaClient.nft_balance.deleteMany({ where: { OR: part } })),
      ...[...changing].flatMap(([quantity, keys]) => balancesUnderBindLimit(keys).map(part => prismaClient.nft_balance.updateMany({ where: { OR: part }, data: { quantity } }))),
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

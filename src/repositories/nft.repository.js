import { BigNumber } from 'bignumber.js'
import { decodeBlockNftTransfers, NFT_STANDARDS, ZERO_ADDRESS } from '../lib/nftTransfers'
import { contractsInterfaces } from '../lib/types'
import { chunkArray } from '../lib/utils'

const PRISMA_MAX_BIND_VALUES = 32767
const BINDS_LEFT_FOR_A_FIND_OFFSET_OR_AN_UPDATED_VALUE = PRISMA_MAX_BIND_VALUES - 1
const OR_ARMS_POSTGRES_STILL_PLANS_IN_LINEAR_TIME = 400

const byKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0
// Holders lock in key order; a batch writes balances only after locking their holder.
const inLockOrder = rows => rows.sort(byKey)
const newestFirst = (a, b) => b.lastBlockNumber - a.lastBlockNumber
const holderId = ({ contract, standard, holder }) => ({ contract, standard, holder })
const balanceId = ({ contract, standard, tokenId, holder }) => ({ contract, standard, tokenId, holder })

function inListsUnderBindLimit (sortedRows, prefix, listed, bindsTakenByTheRestOfTheWhere = 0) {
  const statements = []
  let arms = []
  let binds = 0
  let arm = null
  const sharesPrefix = row => !!arm && prefix.every(field => arm[field] === row[field])

  for (const row of sortedRows) {
    const opensAnArm = !sharesPrefix(row)
    const overBindLimit = bindsTakenByTheRestOfTheWhere + binds + (opensAnArm ? prefix.length + 1 : 1) > BINDS_LEFT_FOR_A_FIND_OFFSET_OR_AN_UPDATED_VALUE
    if (overBindLimit || (opensAnArm && arms.length === OR_ARMS_POSTGRES_STILL_PLANS_IN_LINEAR_TIME)) {
      statements.push(arms)
      arms = []
      binds = 0
      arm = null
    }
    if (!sharesPrefix(row)) {
      arm = { ...Object.fromEntries(prefix.map(field => [field, row[field]])), [listed]: { in: [] } }
      arms.push(arm)
      binds += prefix.length
    }
    arm[listed].in.push(row[listed])
    binds++
  }

  return arms.length ? [...statements, arms] : statements
}

const holdersUnderBindLimit = (sortedHolders, bindsTakenByTheRestOfTheWhere) => inListsUnderBindLimit(sortedHolders, ['contract', 'standard'], 'holder', bindsTakenByTheRestOfTheWhere)
const balancesUnderBindLimit = sortedBalances => inListsUnderBindLimit(sortedBalances, ['contract', 'standard', 'holder'], 'tokenId')
const holderKey = ({ contract, standard, holder }) => `${contract}|${standard}|${holder}`
const balanceKey = ({ contract, standard, tokenId, holder }) => `${contract}|${standard}|${holder}|${tokenId}`
const holdsTheToken = quantity => quantity.gt(0) ? 1 : 0

function netDeltas (signedFacts) {
  const balances = new Map()
  const holders = new Map()

  const touchHolder = (contract, standard, holder, added) => {
    if (holder === ZERO_ADDRESS) return
    const key = holderKey({ contract, standard, holder })
    const entry = holders.get(key) || { key, contract, standard, holder, added: false }
    entry.added = entry.added || added
    holders.set(key, entry)
  }
  const addToBalance = (contract, standard, tokenId, holder, delta) => {
    if (holder === ZERO_ADDRESS) return
    const key = balanceKey({ contract, standard, tokenId, holder })
    const entry = balances.get(key) || { key, contract, standard, tokenId, holder, delta: new BigNumber(0) }
    entry.delta = entry.delta.plus(delta)
    balances.set(key, entry)
  }

  for (const [facts, sign] of signedFacts) {
    for (const fact of facts) {
      const value = new BigNumber(fact.value.toString()).times(sign)
      touchHolder(fact.contract, fact.standard, fact.to, sign > 0)
      touchHolder(fact.contract, fact.standard, fact.from, sign > 0)
      addToBalance(fact.contract, fact.standard, fact.tokenId, fact.to, value)
      addToBalance(fact.contract, fact.standard, fact.tokenId, fact.from, value.negated())
    }
  }

  const changedBalances = [...balances.values()].filter(balance => !balance.delta.isZero())
  return { balances: inLockOrder(changedBalances), holders: inLockOrder([...holders.values()]) }
}

function balanceTransitions (balances, holders, storedQuantities) {
  const holderChanges = new Map(holders.map(holder => [holder.key, { quantity: new BigNumber(0), tokenCount: 0 }]))
  const newBalances = []
  const emptiedBalances = []
  const balancesByNewQuantity = new Map()

  for (const balance of balances) {
    const storedQuantity = storedQuantities.get(balance.key)
    const newQuantity = (storedQuantity || new BigNumber(0)).plus(balance.delta)
    const tokenCountChange = holdsTheToken(newQuantity) - (storedQuantity ? holdsTheToken(storedQuantity) : 0)
    const holderChange = holderChanges.get(holderKey(balance))
    holderChange.tokenCount += tokenCountChange
    holderChange.quantity = holderChange.quantity.plus(balance.standard === contractsInterfaces.ERC721 ? tokenCountChange : balance.delta)

    if (!storedQuantity) newBalances.push({ ...balanceId(balance), quantity: newQuantity.toFixed() })
    else if (newQuantity.isZero()) emptiedBalances.push(balance)
    else {
      const quantity = newQuantity.toFixed()
      if (!balancesByNewQuantity.has(quantity)) balancesByNewQuantity.set(quantity, [])
      balancesByNewQuantity.get(quantity).push(balance)
    }
  }

  return { holderChanges, newBalances, emptiedBalances, balancesByNewQuantity }
}

function lastBlockAfterThisBatch (storedHolder, newestRemainingFact, savedBlock, deletedHashes) {
  if (deletedHashes.has(storedHolder.lastBlockHash)) return [newestRemainingFact, savedBlock].filter(Boolean).sort(newestFirst)[0] || {}
  if (savedBlock && storedHolder.lastBlockNumber < savedBlock.lastBlockNumber) return savedBlock
  return {}
}

export function getNftRepository (prismaClient) {
  async function findManyPerStatement (model, armLists) {
    const rowsPerStatement = await Promise.all(armLists.map(arms => prismaClient[model].findMany({ where: { OR: arms } })))
    return rowsPerStatement.flat()
  }

  async function readHoldersThenBalances (holders, balances) {
    // Holders first: a save committing between these reads makes this batch's version check fail.
    const holderRows = await findManyPerStatement('nft_holder', holdersUnderBindLimit(holders))
    const balanceRows = await findManyPerStatement('nft_balance', balancesUnderBindLimit(balances))

    return {
      holders: new Map(holderRows.map(row => [holderKey(row), row])),
      quantities: new Map(balanceRows.map(row => [balanceKey(row), new BigNumber(row.quantity.toFixed())]))
    }
  }

  async function newestRemainingBlockNumbers (sortedHolderRows, deletedBlockHashes) {
    const readSide = side => holdersUnderBindLimit(sortedHolderRows, deletedBlockHashes.length).map(async arms => {
      const groups = await prismaClient.token_transfer.groupBy({
        by: ['contract', 'standard', side],
        where: { OR: arms.map(({ holder, ...contractAndStandard }) => ({ ...contractAndStandard, [side]: holder })), blockHash: { notIn: deletedBlockHashes } },
        _max: { blockNumber: true }
      })
      return groups.map(row => [holderKey({ contract: row.contract, standard: row.standard, holder: row[side] }), row._max.blockNumber])
    })
    const newestPerSide = (await Promise.all(['to', 'from'].flatMap(readSide))).flat()

    const newestNumber = new Map()
    for (const [key, number] of newestPerSide) {
      if (!newestNumber.has(key) || number > newestNumber.get(key)) newestNumber.set(key, number)
    }
    return newestNumber
  }

  async function readNewestRemainingFacts (sortedHolderRows, deletedBlockHashes) {
    const newestNumber = await newestRemainingBlockNumbers(sortedHolderRows, deletedBlockHashes)
    const numberLists = chunkArray([...new Set(newestNumber.values())], BINDS_LEFT_FOR_A_FIND_OFFSET_OR_AN_UPDATED_VALUE)
    const blocks = (await Promise.all(numberLists.map(numbers => prismaClient.block.findMany({ where: { number: { in: numbers } }, select: { number: true, hash: true } })))).flat()
    const hashAt = new Map(blocks.map(({ number, hash }) => [number, hash]))

    return new Map([...newestNumber].map(([key, number]) => [key, { lastBlockNumber: number, lastBlockHash: hashAt.get(number) }]))
  }

  function holderStatements ({ holders, stored, holderChanges, newestRemainingFacts, savedBlock, deletedHashes }) {
    const newHolders = []
    const holderUpdates = []
    const holderDeletes = []

    for (const holder of holders) {
      const storedHolder = stored.holders.get(holder.key)
      const change = holderChanges.get(holder.key)
      const savedBlockOfHolder = holder.added ? savedBlock : null

      if (!storedHolder) {
        newHolders.push({ ...holderId(holder), quantity: change.quantity.toFixed(), tokenCount: change.tokenCount, ...savedBlockOfHolder, version: 1 })
        continue
      }

      const lastBlock = lastBlockAfterThisBatch(storedHolder, newestRemainingFacts.get(holder.key), savedBlockOfHolder, deletedHashes)
      const noFactLeft = deletedHashes.has(storedHolder.lastBlockHash) && !lastBlock.lastBlockHash
      if (noFactLeft) holderDeletes.push(prismaClient.nft_holder.delete({ where: { contract_standard_holder: holderId(holder), quantity: 0, tokenCount: 0 } }))

      // `update` throws P2025 on a stale version; `updateMany` would match nothing and commit.
      holderUpdates.push(prismaClient.nft_holder.update({
        where: { contract_standard_holder: holderId(holder), version: storedHolder.version },
        data: { quantity: { increment: change.quantity.toFixed() }, tokenCount: { increment: change.tokenCount }, version: { increment: 1 }, ...lastBlock }
      }))
    }

    return { newHolders, holderUpdates, holderDeletes }
  }

  function balanceStatements ({ newBalances, emptiedBalances, balancesByNewQuantity }) {
    return {
      createBalances: newBalances.length ? [prismaClient.nft_balance.createMany({ data: newBalances })] : [],
      deleteBalances: balancesUnderBindLimit(emptiedBalances).map(arms => prismaClient.nft_balance.deleteMany({ where: { OR: arms } })),
      updateBalances: [...balancesByNewQuantity].flatMap(([quantity, balances]) =>
        balancesUnderBindLimit(balances).map(arms => prismaClient.nft_balance.updateMany({ where: { OR: arms }, data: { quantity } })))
    }
  }

  async function ownershipStatements ({ addedFacts, undoneFacts, block, deletedBlockHashes }) {
    const { balances, holders } = netDeltas([[addedFacts, 1], [undoneFacts, -1]])
    if (!holders.length) return []

    const stored = await readHoldersThenBalances(holders, balances)
    const removedSinceTheFactsWereRead = new Set(holders.filter(holder => !holder.added && !stored.holders.has(holder.key)).map(holder => holder.key))
    const holdersToWrite = holders.filter(holder => !removedSinceTheFactsWereRead.has(holder.key))
    const balancesToWrite = balances.filter(balance => !removedSinceTheFactsWereRead.has(holderKey(balance)))

    const deletedHashes = new Set(deletedBlockHashes)
    const holdersLastSeenInADeletedBlock = holders.map(holder => stored.holders.get(holder.key)).filter(row => row && deletedHashes.has(row.lastBlockHash))
    const newestRemainingFacts = await readNewestRemainingFacts(holdersLastSeenInADeletedBlock, deletedBlockHashes)

    const transitions = balanceTransitions(balancesToWrite, holders, stored.quantities)
    const savedBlock = block ? { lastBlockNumber: block.number, lastBlockHash: block.hash } : null
    const { newHolders, holderUpdates, holderDeletes } = holderStatements({
      holders: holdersToWrite, stored, holderChanges: transitions.holderChanges, newestRemainingFacts, savedBlock, deletedHashes
    })
    const { createBalances, deleteBalances, updateBalances } = balanceStatements(transitions)

    return [
      ...(newHolders.length ? [prismaClient.nft_holder.createMany({ data: newHolders })] : []),
      ...holderUpdates,
      ...createBalances,
      ...deleteBalances,
      ...updateBalances,
      ...holderDeletes
    ]
  }

  async function statements ({ blocks = [], block = null, events = [] }) {
    const deletedBlockHashes = blocks.map(b => b.hash)
    const factsOfDeletedBlocks = { blockHash: { in: deletedBlockHashes }, standard: { in: NFT_STANDARDS } }
    const undoneFacts = blocks.length ? await prismaClient.token_transfer.findMany({ where: factsOfDeletedBlocks }) : []
    const addedFacts = block ? decodeBlockNftTransfers(events) : []
    const ownership = await ownershipStatements({ addedFacts, undoneFacts, block, deletedBlockHashes })
    const undoFacts = undoneFacts.length ? [prismaClient.token_transfer.deleteMany({ where: factsOfDeletedBlocks })] : []
    const insertFacts = addedFacts.length ? [prismaClient.token_transfer.createMany({ data: addedFacts })] : []

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

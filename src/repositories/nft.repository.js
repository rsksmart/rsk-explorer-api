import { BigNumber } from 'bignumber.js'
import { decodeBlockNftTransfers, NFT_STANDARDS, ZERO_ADDRESS } from '../lib/nftTransfers'
import { contractsInterfaces } from '../lib/types'
import { chunkArray } from '../lib/utils'

const PRISMA_MAX_QUERY_PARAMETERS = 32767
const QUERY_PARAMETERS_LEFT_FOR_AN_OFFSET_OR_A_NEW_VALUE = PRISMA_MAX_QUERY_PARAMETERS - 1
const OR_CONDITIONS_POSTGRES_STILL_PLANS_IN_LINEAR_TIME = 400

const byKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0
// Holder inserts, then updates, each in key order; balances follow their locked holder.
const inLockOrder = rows => rows.sort(byKey)
const newestFirst = (a, b) => b.lastBlockNumber - a.lastBlockNumber
const holderId = ({ contract, standard, holder }) => ({ contract, standard, holder })
const balanceId = ({ contract, standard, tokenId, holder }) => ({ contract, standard, tokenId, holder })

function orConditionsPerStatement (sortedRows, sharedFields, listedField, parametersUsedByTheRestOfTheWhere = 0) {
  const conditionsPerStatement = []
  let conditions = []
  let parameters = 0
  let condition = null
  const sharesFieldsWithCondition = row => !!condition && sharedFields.every(field => condition[field] === row[field])

  for (const row of sortedRows) {
    const startsACondition = !sharesFieldsWithCondition(row)
    const overParameterLimit = parametersUsedByTheRestOfTheWhere + parameters + (startsACondition ? sharedFields.length + 1 : 1) >
      QUERY_PARAMETERS_LEFT_FOR_AN_OFFSET_OR_A_NEW_VALUE
    if (
      overParameterLimit ||
      (startsACondition && conditions.length === OR_CONDITIONS_POSTGRES_STILL_PLANS_IN_LINEAR_TIME)
    ) {
      conditionsPerStatement.push(conditions)
      conditions = []
      parameters = 0
      condition = null
    }
    if (!sharesFieldsWithCondition(row)) {
      condition = { ...Object.fromEntries(sharedFields.map(field => [field, row[field]])), [listedField]: { in: [] } }
      conditions.push(condition)
      parameters += sharedFields.length
    }
    condition[listedField].in.push(row[listedField])
    parameters++
  }

  return conditions.length ? [...conditionsPerStatement, conditions] : conditionsPerStatement
}

const holderConditionsPerStatement = (sortedHolders, parametersUsedByTheRestOfTheWhere) =>
  orConditionsPerStatement(sortedHolders, ['contract', 'standard'], 'holder', parametersUsedByTheRestOfTheWhere)
const balanceConditionsPerStatement = sortedBalances =>
  orConditionsPerStatement(sortedBalances, ['contract', 'standard', 'holder'], 'tokenId')
const holderKey = ({ contract, standard, holder }) => `${contract}|${standard}|${holder}`
const balanceKey = ({ contract, standard, tokenId, holder }) => `${contract}|${standard}|${holder}|${tokenId}`
const heldTokenCount = quantity => quantity.gt(0) ? 1 : 0

function netChanges (addedFacts, factsOfDeletedBlocks) {
  const balances = new Map()
  const holders = new Map()

  const recordHolder = (contract, standard, holder, added) => {
    if (holder === ZERO_ADDRESS) return
    const key = holderKey({ contract, standard, holder })
    const entry = holders.get(key) || { key, contract, standard, holder, added: false }
    entry.added = entry.added || added
    holders.set(key, entry)
  }
  const addToBalance = (contract, standard, tokenId, holder, change) => {
    if (holder === ZERO_ADDRESS) return
    const key = balanceKey({ contract, standard, tokenId, holder })
    const entry = balances.get(key) || { key, contract, standard, tokenId, holder, change: new BigNumber(0) }
    entry.change = entry.change.plus(change)
    balances.set(key, entry)
  }

  for (const [facts, sign] of [[addedFacts, 1], [factsOfDeletedBlocks, -1]]) {
    for (const fact of facts) {
      const value = new BigNumber(fact.value.toString()).times(sign)
      recordHolder(fact.contract, fact.standard, fact.to, sign > 0)
      recordHolder(fact.contract, fact.standard, fact.from, sign > 0)
      addToBalance(fact.contract, fact.standard, fact.tokenId, fact.to, value)
      addToBalance(fact.contract, fact.standard, fact.tokenId, fact.from, value.negated())
    }
  }

  const changedBalances = [...balances.values()].filter(balance => !balance.change.isZero())
  return { balances: inLockOrder(changedBalances), holders: inLockOrder([...holders.values()]) }
}

function balanceTransitions (balances, holders, storedQuantities) {
  const holderChanges = new Map(holders.map(holder => [holder.key, { quantity: new BigNumber(0), tokenCount: 0 }]))
  const newBalances = []
  const emptiedBalances = []
  const balancesByNewQuantity = new Map()

  for (const balance of balances) {
    const storedQuantity = storedQuantities.get(balance.key)
    const newQuantity = (storedQuantity || new BigNumber(0)).plus(balance.change)
    const tokenCountChange = heldTokenCount(newQuantity) - (storedQuantity ? heldTokenCount(storedQuantity) : 0)
    const holderChange = holderChanges.get(holderKey(balance))
    holderChange.tokenCount += tokenCountChange
    holderChange.quantity = holderChange.quantity.plus(
      balance.standard === contractsInterfaces.ERC721 ? tokenCountChange : balance.change
    )

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
  if (deletedHashes.has(storedHolder.lastBlockHash)) {
    return [newestRemainingFact, savedBlock].filter(Boolean).sort(newestFirst)[0] || {}
  }
  if (savedBlock && storedHolder.lastBlockNumber < savedBlock.lastBlockNumber) return savedBlock
  return {}
}

export function getNftRepository (prismaClient) {
  async function findManyPerStatement (model, conditionsPerStatement) {
    const rowsPerStatement = await Promise.all(
      conditionsPerStatement.map(conditions => prismaClient[model].findMany({ where: { OR: conditions } }))
    )
    return rowsPerStatement.flat()
  }

  async function readHoldersThenBalances (holders, balances) {
    const holderRows = await findManyPerStatement('nft_holder', holderConditionsPerStatement(holders))
    const balanceRows = await findManyPerStatement('nft_balance', balanceConditionsPerStatement(balances))

    return {
      holders: new Map(holderRows.map(row => [holderKey(row), row])),
      quantities: new Map(balanceRows.map(row => [balanceKey(row), new BigNumber(row.quantity.toFixed())]))
    }
  }

  async function newestRemainingBlockNumbers (sortedHolderRows, deletedBlockHashes) {
    const readSide = side => holderConditionsPerStatement(sortedHolderRows, deletedBlockHashes.length).map(async conditions => {
      const groups = await prismaClient.token_transfer.groupBy({
        by: ['contract', 'standard', side],
        where: {
          OR: conditions.map(({ holder, ...contractAndStandard }) => ({ ...contractAndStandard, [side]: holder })),
          blockHash: { notIn: deletedBlockHashes }
        },
        _max: { blockNumber: true }
      })
      return groups.map(row => [
        holderKey({ contract: row.contract, standard: row.standard, holder: row[side] }),
        row._max.blockNumber
      ])
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
    const numberLists = chunkArray([...new Set(newestNumber.values())], QUERY_PARAMETERS_LEFT_FOR_AN_OFFSET_OR_A_NEW_VALUE)
    const blocksOfNewestFacts = (await Promise.all(numberLists.map(numbers => prismaClient.block.findMany({
      where: { number: { in: numbers } },
      select: { number: true, hash: true }
    })))).flat()
    const hashAt = new Map(blocksOfNewestFacts.map(({ number, hash }) => [number, hash]))

    return new Map([...newestNumber].map(([key, number]) => [
      key,
      { lastBlockNumber: number, lastBlockHash: hashAt.get(number) }
    ]))
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
        newHolders.push({
          ...holderId(holder),
          quantity: change.quantity.toFixed(),
          tokenCount: change.tokenCount,
          ...savedBlockOfHolder,
          version: 1
        })
        continue
      }

      const lastBlock = lastBlockAfterThisBatch(
        storedHolder,
        newestRemainingFacts.get(holder.key),
        savedBlockOfHolder,
        deletedHashes
      )
      const noFactLeft = deletedHashes.has(storedHolder.lastBlockHash) && !lastBlock.lastBlockHash
      if (noFactLeft) {
        holderDeletes.push(prismaClient.nft_holder.delete({
          where: { contract_standard_holder: holderId(holder), quantity: 0, tokenCount: 0 }
        }))
      }

      // `update` throws P2025 on a stale version; `updateMany` would match nothing and commit.
      holderUpdates.push(prismaClient.nft_holder.update({
        where: {
          contract_standard_holder: holderId(holder),
          version: storedHolder.version,
          lastBlockHash: storedHolder.lastBlockHash
        },
        data: {
          quantity: { increment: change.quantity.toFixed() },
          tokenCount: { increment: change.tokenCount },
          version: { increment: 1 },
          ...lastBlock
        }
      }))
    }

    return { newHolders, holderUpdates, holderDeletes }
  }

  function balanceStatements ({ newBalances, emptiedBalances, balancesByNewQuantity }) {
    return {
      createBalances: newBalances.length ? [prismaClient.nft_balance.createMany({ data: newBalances })] : [],
      deleteBalances: balanceConditionsPerStatement(emptiedBalances).map(conditions =>
        prismaClient.nft_balance.deleteMany({ where: { OR: conditions } })
      ),
      updateBalances: [...balancesByNewQuantity].flatMap(([quantity, balances]) =>
        balanceConditionsPerStatement(balances).map(conditions =>
          prismaClient.nft_balance.updateMany({ where: { OR: conditions }, data: { quantity } })
        )
      )
    }
  }

  async function ownershipStatements ({ addedFacts, factsOfDeletedBlocks, newBlock, deletedBlockHashes }) {
    const { balances, holders } = netChanges(addedFacts, factsOfDeletedBlocks)
    if (!holders.length) return []

    const stored = await readHoldersThenBalances(holders, balances)
    const removedSinceTheFactsWereRead = new Set(holders
      .filter(holder => !holder.added && !stored.holders.has(holder.key))
      .map(holder => holder.key))
    const holdersToWrite = holders.filter(holder => !removedSinceTheFactsWereRead.has(holder.key))
    const balancesToWrite = balances.filter(balance => !removedSinceTheFactsWereRead.has(holderKey(balance)))

    const deletedHashes = new Set(deletedBlockHashes)
    const holdersLastSeenInADeletedBlock = holders
      .map(holder => stored.holders.get(holder.key))
      .filter(row => row && deletedHashes.has(row.lastBlockHash))
    const newestRemainingFacts = await readNewestRemainingFacts(holdersLastSeenInADeletedBlock, deletedBlockHashes)

    const transitions = balanceTransitions(balancesToWrite, holders, stored.quantities)
    const savedBlock = newBlock ? { lastBlockNumber: newBlock.number, lastBlockHash: newBlock.hash } : null
    const { newHolders, holderUpdates, holderDeletes } = holderStatements({
      holders: holdersToWrite,
      stored,
      holderChanges: transitions.holderChanges,
      newestRemainingFacts,
      savedBlock,
      deletedHashes
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

  const nftFactsOfBlocks = blockHashes => ({ blockHash: { in: blockHashes }, standard: { in: NFT_STANDARDS } })
  const readFactsOfBlocks = blockHashes => prismaClient.token_transfer.findMany({ where: nftFactsOfBlocks(blockHashes) })
  const insertFacts = facts => facts.length ? [prismaClient.token_transfer.createMany({ data: facts })] : []
  const deleteFacts = (blockHashes, facts) => facts.length
    ? [prismaClient.token_transfer.deleteMany({ where: nftFactsOfBlocks(blockHashes) })]
    : []

  return {
    async insertStatements (newBlock, newBlockEvents) {
      const addedFacts = decodeBlockNftTransfers(newBlockEvents)
      const ownership = await ownershipStatements({
        addedFacts,
        factsOfDeletedBlocks: [],
        newBlock,
        deletedBlockHashes: []
      })
      return [...insertFacts(addedFacts), ...ownership]
    },
    async undoStatements (blocksToDelete) {
      const deletedBlockHashes = blocksToDelete.map(block => block.hash)
      const factsOfDeletedBlocks = await readFactsOfBlocks(deletedBlockHashes)
      const ownership = await ownershipStatements({
        addedFacts: [],
        factsOfDeletedBlocks,
        newBlock: null,
        deletedBlockHashes
      })
      return [...deleteFacts(deletedBlockHashes, factsOfDeletedBlocks), ...ownership]
    },
    async replaceStatements (blocksToDelete, newBlock, newBlockEvents) {
      const deletedBlockHashes = blocksToDelete.map(block => block.hash)
      const factsOfDeletedBlocks = await readFactsOfBlocks(deletedBlockHashes)
      const addedFacts = decodeBlockNftTransfers(newBlockEvents)
      const ownership = await ownershipStatements({ addedFacts, factsOfDeletedBlocks, newBlock, deletedBlockHashes })
      return {
        undo: [...deleteFacts(deletedBlockHashes, factsOfDeletedBlocks), ...ownership],
        insert: insertFacts(addedFacts)
      }
    }
  }
}

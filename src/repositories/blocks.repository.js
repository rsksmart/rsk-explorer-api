import { rawBlockToEntity, blockEntityToRaw } from '../converters/blocks.converters'
import { generateFindQuery } from './utils'
import { blockRelatedTables } from './includeRelatedTables'

import {
  txRepository,
  internalTxRepository,
  txPendingRepository,
  blockTraceRepository,
  eventRepository,
  tokenRepository,
  summaryRepository,
  addressRepository,
  balancesRepository,
  statusRepository,
  nftRepository,
  tokenStateRepository
} from '.'

const DELETE_ATTEMPTS = 3
const SAVE_ATTEMPTS = 3
const STALE_READ_ERRORS = ['P2002', 'P2025']
const READ_COMMITTED = { isolationLevel: 'ReadCommitted' }
const RETRYABLE_DELETE_ERRORS = ['P2025', 'P2003']
const DEADLOCK_IN_AN_UNCODED_PRISMA_ERROR = 'code: "40P01"'
const isRetryableDeleteError = error => RETRYABLE_DELETE_ERRORS.includes(error.code) ||
  (!error.code && String(error.message).includes(DEADLOCK_IN_AN_UNCODED_PRISMA_ERROR))

export function getBlocksRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const block = await prismaClient.block.findFirst(generateFindQuery(query, project, {}, project))

      return block ? blockEntityToRaw(block) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
      const blocks = await prismaClient.block.findMany(generateFindQuery(query, project, blockRelatedTables, sort, limit))

      return Object.keys(project).length ? blocks : blocks.map(blockEntityToRaw)
    },
    async countDocuments (query = {}) {
      const count = await prismaClient.block.count({where: query})

      return count
    },
    insertOne (data) {
      return prismaClient.block.createMany({ data: rawBlockToEntity(data), skipDuplicates: true })
    },
    async saveBlockData (data, { replace = false } = {}) {
      const { block, transactions, internalTransactions, events, tokenAddresses, tokenStates, addresses, balances, latestBalances, status } = data
      if (!transactions.length && block.number > 0) throw new Error(`Invalid block ${block.number}. Missing transactions`)

      const getAddressesQueries = () => {
        const queries = []

        for (const address of addresses) {
          const { balance, blockNumber } = latestBalances.balances.find(b => b.address === address.address)
          const extraData = { isMiner: block.miner === address.address, balance, blockNumber }
          queries.push(addressRepository.insertOne(address, extraData))
        }

        return queries.flat()
      }

      const getTxsAndPendingTxsQueries = () => {
        const queries = []

        for (const tx of transactions) {
          queries.push(...txRepository.insertOne(tx))
          queries.push(txPendingRepository.deleteOne({ hash: tx.hash }))
        }

        // Set status 'REMOVED' to any old transactions stuck on database
        // const oneHourAgo = String(Math.floor(new Date().getTime() / 1000) - 3600)
        // queries.push(txPendingRepository.updateMany({ timestamp: { lte: oneHourAgo } }, { status: 'REMOVED' }))

        return queries
      }

      const getItxsQueries = () => {
        const queries = []

        for (const itx of internalTransactions) {
          queries.push(...internalTxRepository.insertOne(itx))
        }

        return queries
      }

      const getEventsQueries = () => {
        const queries = []

        for (const event of events) {
          queries.push(eventRepository.insertOne(event))
        }

        return queries
      }

      const getTokensAddressesQueries = () => {
        const queries = []

        for (const tokenAddress of tokenAddresses) {
          queries.push(tokenRepository.insertOne(tokenAddress))
        }

        return queries
      }

      const generateTransaction = async () => {
        const targets = replace ? await findTargets({ number: block.number }) : []
        const nft = replace
          ? await nftRepository.replaceStatements(targets, block, events)
          : { undo: [], insert: await nftRepository.insertStatements(block, events) }
        const replacedBlock = replace ? await deleteStatements(targets, nft.undo) : []

        const transaction = [
          this.insertOne(block), // insert block
          ...nft.insert,
          ...tokenStateRepository.insertStatements(block, tokenStates),
          ...getAddressesQueries(), // insert addresses
          ...balancesRepository.insertMany(balances, latestBalances), // insert balances
          ...getTxsAndPendingTxsQueries(), // insert txs and update pending txs
          ...getItxsQueries(), // insert internal transactions
          blockTraceRepository.insertOne(internalTransactions), // insert blockTrace
          ...getEventsQueries(), // insert events
          ...getTokensAddressesQueries(), // insert tokenAddresses
          ...summaryRepository.insertOne(data) // save block summary
        ]

        if (replace) {
          transaction.unshift(...replacedBlock)
        }

        if (status) {
          transaction.push(statusRepository.insertOne(status)) // insert status
        }

        return transaction
      }

      const attempts = replace ? 1 : SAVE_ATTEMPTS
      let lastStaleRead
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await prismaClient.$transaction(await generateTransaction(), READ_COMMITTED)
        } catch (error) {
          if (!STALE_READ_ERRORS.includes(error.code)) throw error
          lastStaleRead = error
        }
      }
      throw lastStaleRead
    },
    deleteOne (query) {
      return deleteBlocks(query)
    },
    deleteMany (query) {
      return deleteBlocks(query)
    }
  }

  async function deleteStatements (blocks, nftUndo = null) {
    return [
      ...(nftUndo || await nftRepository.undoStatements(blocks)),
      ...await tokenStateRepository.undoStatements(blocks),
      ...blocks.map(({ number, hash }) => prismaClient.block.delete({ where: { number, hash } }))
    ]
  }

  function findTargets (where) {
    return prismaClient.block.findMany({ where, select: { number: true, hash: true }, orderBy: { number: 'asc' } })
  }

  async function deleteBlocks (where) {
    const pinned = await findTargets(where)
    let targets = pinned
    let lastRetryableError

    for (let attempt = 1; attempt <= DELETE_ATTEMPTS && targets.length; attempt++) {
      try {
        await prismaClient.$transaction(await deleteStatements(targets), READ_COMMITTED)
        return { count: targets.length }
      } catch (error) {
        if (!isRetryableDeleteError(error)) throw error
        lastRetryableError = error
        if (attempt < DELETE_ATTEMPTS) targets = await findTargets({ hash: { in: pinned.map(b => b.hash) } })
      }
    }

    if (targets.length) throw lastRetryableError
    return { count: 0 }
  }
}

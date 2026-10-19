import { rawBlockToEntity, blockEntityToRaw } from '../converters/blocks.converters'
import { generateFindQuery } from './utils'
import { blockRelatedTables } from './includeRelatedTables'
import { retry } from '../lib/retry'

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
      const {
        block,
        transactions,
        internalTransactions,
        events,
        tokenAddresses,
        tokenStates,
        addresses,
        balances,
        latestBalances,
        status
      } = data
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
        const blocksToDelete = replace ? await findBlocksToDelete({ number: block.number }) : []
        let replacedBlockDeletes = []
        let nftInserts
        if (blocksToDelete.length) {
          const nftStatements = await nftRepository.replaceStatements(blocksToDelete, block, events)
          replacedBlockDeletes = await deleteStatements(blocksToDelete, nftStatements.undo)
          nftInserts = nftStatements.insert
        } else {
          nftInserts = await nftRepository.insertStatements(block, events)
        }

        const transaction = [
          ...replacedBlockDeletes,
          this.insertOne(block), // insert block
          ...nftInserts,
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

        if (status) {
          transaction.push(statusRepository.insertOne(status)) // insert status
        }

        return transaction
      }

      return retry({
        maxAttempts: replace ? 1 : SAVE_ATTEMPTS,
        isRetryable: error => STALE_READ_ERRORS.includes(error.code),
        run: async () => prismaClient.$transaction(await generateTransaction(), READ_COMMITTED)
      })
    },
    deleteOne (query) {
      return deleteBlocks(query)
    },
    deleteMany (query) {
      return deleteBlocks(query)
    }
  }

  async function deleteStatements (blocksToDelete, nftUndo) {
    return [
      ...nftUndo,
      ...await tokenStateRepository.undoStatements(blocksToDelete),
      ...blocksToDelete.map(({ number, hash }) => prismaClient.block.delete({ where: { number, hash } }))
    ]
  }

  function findBlocksToDelete (where) {
    return prismaClient.block.findMany({ where, select: { number: true, hash: true }, orderBy: { number: 'asc' } })
  }

  async function deleteBlocks (where) {
    const pinned = await findBlocksToDelete(where)
    let blocksToDelete = pinned
    return retry({
      maxAttempts: DELETE_ATTEMPTS,
      isRetryable: isRetryableDeleteError,
      run: async () => {
        if (!blocksToDelete.length) return { count: 0 }
        await prismaClient.$transaction(
          await deleteStatements(blocksToDelete, await nftRepository.undoStatements(blocksToDelete)),
          READ_COMMITTED
        )
        return { count: blocksToDelete.length }
      },
      beforeRetry: async () => {
        blocksToDelete = await findBlocksToDelete({ hash: { in: pinned.map(b => b.hash) } })
      }
    })
  }
}

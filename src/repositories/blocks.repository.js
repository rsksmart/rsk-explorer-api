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
  statusRepository
} from '.'

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
    async saveBlockData (data) {
      const { block, transactions, internalTransactions, events, tokenAddresses, addresses, balances, latestBalances, status } = data
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
          queries.push(txRepository.insertOne(tx))
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

      const generateTransaction = () => {
        const transaction = [
          this.insertOne(block), // insert block
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

      return prismaClient.$transaction(generateTransaction())
    },
    deleteOne (query) {
      return prismaClient.block.deleteMany({ where: query })
    },
    deleteMany (query) {
      return prismaClient.block.deleteMany({ where: query })
    }
  }
}

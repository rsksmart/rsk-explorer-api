import { rawBlockToEntity, blockEntityToRaw } from '../converters/blocks.converters'
import { generateFindQuery } from './utils'
import { blockRelatedTables } from './includeRelatedTables'
import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'

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
      return [prismaClient.block.createMany({data: rawBlockToEntity(data), skipDuplicates: true})]
    },
    async saveBlockData (data) {
      const { block, transactions, internalTransactions, events, tokenAddresses, addresses, balances, latestBalances, status } = data
      const transactionQueries = []

      // insert block
      transactionQueries.push(...this.insertOne(block))

      // insert addresses
      for (const address of addresses) {
        if (!isAddress(address.address)) {
          throw new Error(`Invalid address ${address.address}`)
        } else {
          const { balance, blockNumber } = latestBalances.balances.find(b => b.address === address.address)
          transactionQueries.push(...addressRepository.insertOne(
            address,
            {
              isMiner: block.miner === address.address,
              balance,
              blockNumber
            }
          ))
        }
      }

      // insert balances
      transactionQueries.push(...balancesRepository.insertMany(balances, latestBalances))

      // insert txs and delete pendings
      if (!transactions.length && block.number > 0) {
        throw new Error(`Couldn't get transactions for block ${block.number}`)
      } else {
        for (const tx of transactions) {
          transactionQueries.push(...txRepository.insertOne(tx), ...txPendingRepository.deleteOne({ hash: tx.hash }))
        }
      }

      // insert internal transactions
      for (const itx of internalTransactions) {
        transactionQueries.push(...internalTxRepository.insertOne(itx))
      }

      // insert blockTrace
      transactionQueries.push(...blockTraceRepository.insertOne(internalTransactions))

      // insert events
      for (const event of events) {
        transactionQueries.push(...eventRepository.insertOne(event))
      }

      // insert tokenAddresses
      for (const token of tokenAddresses) {
        transactionQueries.push(...tokenRepository.insertOne(token))
      }

      // save block summary
      transactionQueries.push(...summaryRepository.insertOne(data))

      // insert status
      if (status) {
        transactionQueries.push(...statusRepository.insertOne(status))
      }

      return prismaClient.$transaction(transactionQueries)
    },
    async deleteBlockData (blockNumber) {
      const transactionQueries = [prismaClient.block.deleteMany({where: {number: blockNumber}})]

      // this will delete only the addresses that have been first registered with this block;
      // if there's any other balance for the address added in another block, it won't delete the address
      const addressesBalancesForThisBlock = await balancesRepository.find({blockNumber})
      const addressesTokensForThisBlock = await tokenRepository.find({blockNumber})

      const addressesToDeleteForThisblock = new Set(
        addressesBalancesForThisBlock
          .map(b => b.address)
          .concat(addressesTokensForThisBlock.map(t => t.address))
      )

      const deletableAddresses = []

      for (const address of addressesToDeleteForThisblock) {
        const balancesForOtherBlocks = await balancesRepository.find({
          AND: [{address}, {blockNumber: {lt: blockNumber}}]
        })
        const tokensForOtherBlocks = await tokenRepository.find({
          AND: [{address}, {blockNumber: {lt: blockNumber}}]
        })

        if (!(balancesForOtherBlocks.length || tokensForOtherBlocks.length)) {
          deletableAddresses.push(address)
        }
      }
      transactionQueries.push(...addressRepository.deleteMany(deletableAddresses))

      return prismaClient.$transaction(transactionQueries)
    },
    async deleteBlocksByNumbers (blocks = []) {
      try {
        for (const number of blocks) {
          await this.deleteBlockData(number)
        }
      } catch (error) {
        throw error
      }
    }
  }
}

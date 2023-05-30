import { prismaClient } from '../lib/Setup'
import { rawBlockToEntity, blockEntityToRaw } from '../converters/block.converters'
import { generateFindQuery, mongoQueryToPrisma } from './utils'
import { blockRelatedTables } from './includeRelatedTables'
import { txRepository } from './tx.repository'
import { internalTxRepository } from './internalTx.repository'
import { txPendingRepository } from './txPending.repository'
import { blockTraceRepository } from './blockTrace.repository'
import { eventRepository } from './event.repository'
import { tokenRepository } from './token.repository'
import { summaryRepository } from './summary.repository'
import { addressRepository } from './address.repository'
import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import { balancesRepository } from './balances.repository'

export const blockRepository = {
  async findOne (query = {}, project = {}, collection) {
    query = generateFindQuery(query, project, blockRelatedTables, project)
    const block = await prismaClient.block.findFirst(query)

    if (block) {
      return Object.keys(project).length ? block : blockEntityToRaw(block)
    } else {
      return null
    }
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const blocks = await prismaClient.block.findMany(generateFindQuery(query, project, blockRelatedTables, sort, limit))

    return Object.keys(project).length ? blocks : blocks.map(blockEntityToRaw)
  },
  async countDocuments (query = {}, collection) {
    const count = await prismaClient.block.count({where: mongoQueryToPrisma(query)})

    return count
  },
  insertOne (data, collection) {
    const { uncles, number } = data
    const transactionQueries = [prismaClient.block.createMany({data: rawBlockToEntity(data), skipDuplicates: true})]

    const unclesToSave = uncles.map(hash => ({hash, blockNumber: number}))
    transactionQueries.push(prismaClient.uncle.createMany({data: unclesToSave, skipDuplicates: true}))

    return transactionQueries
  },
  async saveBlockData (data) {
    const { block, transactions, internalTransactions, events, tokenAddresses, addresses, balances } = data
    const transactionQueries = []

    // insert block
    transactionQueries.push(...this.insertOne(block))

    // insert addresses
    for (const address of addresses) {
      if (!isAddress(address.address)) {
        throw new Error(`Invalid address ${address.address}`)
      } else {
        transactionQueries.push(...addressRepository.updateOne({ address: address.address }, { $set: address }, { upsert: true }))
      }
    }

    // insert balances
    transactionQueries.push(...balancesRepository.insertMany(balances))

    // insert txs and delete pendings
    for (const tx of transactions) {
      transactionQueries.push(...txRepository.insertOne(tx), ...txPendingRepository.deleteOne({ hash: tx.hash }))
    }

    // insert internal transactions
    for (const itx of internalTransactions) {
      transactionQueries.push(...internalTxRepository.insertOne(itx))
    }

    // insert blockTrace
    transactionQueries.push(...blockTraceRepository.insertOne(internalTransactions))

    // insert events
    for (const event of events) {
      transactionQueries.push(...eventRepository.updateOne(
        { eventId: event.eventId },
        { $set: event },
        { upsert: true }))
    }

    // insert tokenAddresses
    const tokenAddressesIds = []
    for (const token of tokenAddresses) {
      token.id = token.address + '_' + token.contract
      tokenAddressesIds.push(token.id)
      transactionQueries.push(...tokenRepository.updateOne({ id: token.id }, { $set: token }, { upsert: true }))
    }
    data.tokenAddressesIds = tokenAddressesIds

    // save block summary
    transactionQueries.push(...summaryRepository.insertOne(data))

    const res = prismaClient.$transaction(transactionQueries)

    return res
  },
  async deleteMany (filter, collection) {
    const deleted = await prismaClient.block.deleteMany({where: mongoQueryToPrisma(filter)})

    return deleted
  }
}

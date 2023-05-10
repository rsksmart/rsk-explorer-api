import { prismaClient } from '../lib/Setup'
import { mongoQueryToPrisma, generateFindQuery } from './utils'
import { rawBlockSummaryToEntity, summaryEntityToRaw } from '../converters/summary.converters'
import { summaryRelatedTables } from './includeRelatedTables'

export const summaryRepository = {
  async findOne (query = {}, project = {}, collection) {
    const summary = await prismaClient.block_summary.findFirst(generateFindQuery(query, project, summaryRelatedTables))

    return summary ? summaryEntityToRaw(summary) : null
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const summaries = await prismaClient.block_summary.findMany(generateFindQuery(query, project, summaryRelatedTables, sort, limit))

    return Object.keys(project).length ? summaries : summaries.map(summaryEntityToRaw)
  },
  async countDocuments (query = {}, collection) {
    const count = await prismaClient.block_summary.count({where: mongoQueryToPrisma(query)})

    return count
  },
  async updateOne (filter, update, options = {}, collection) {
    const {$set: data} = update
    const {transactions, internalTransactions, addresses, tokenAddressesIds, events, suicides} = data.data
    const summaryToSave = rawBlockSummaryToEntity(data)
    const summaryId = summaryToSave.id

    const transactionQueries = [prismaClient.block_summary.upsert({where: filter, create: summaryToSave, update: summaryToSave})]

    const txsToSave = transactions.map(tx => ({hash: tx.hash, summaryId}))
    transactionQueries.push(prismaClient.transaction_in_summary.createMany({data: txsToSave, skipDuplicates: true}))

    const itxsToSave = internalTransactions.map(itx => ({internalTxId: itx.internalTxId, summaryId}))
    transactionQueries.push(prismaClient.internal_transaction_in_summary.createMany({data: itxsToSave, skipDuplicates: true}))

    const addressesToSave = addresses.map(address => ({address: address.address, summaryId}))
    transactionQueries.push(prismaClient.address_in_summary.createMany({data: addressesToSave, skipDuplicates: true}))

    const tokenAddressesToSave = tokenAddressesIds.map(tokenId => ({tokenId, summaryId}))
    transactionQueries.push(prismaClient.token_address_in_summary.createMany({data: tokenAddressesToSave, skipDuplicates: true}))

    const eventsToSave = events.map(event => ({eventId: event.eventId, summaryId}))
    transactionQueries.push(prismaClient.event_in_summary.createMany({data: eventsToSave, skipDuplicates: true}))

    const suicidesToSave = suicides.map(suicide => ({internalTxId: suicide.internalTxId, summaryId}))
    transactionQueries.push(prismaClient.suicide_in_summary.createMany({data: suicidesToSave, skipDuplicates: true}))

    return transactionQueries
  },
  async deleteOne (query, collection) {
    const deleted = await prismaClient.block_summary.delete({where: query})

    return deleted
  }
}

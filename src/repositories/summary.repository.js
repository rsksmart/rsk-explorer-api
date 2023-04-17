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

    const queries = [prismaClient.block_summary.upsert({where: filter, create: summaryToSave, update: summaryToSave})]

    for (const tx of transactions) {
      const txToSave = {hash: tx.hash, summaryId}
      queries.push(prismaClient.transaction_in_summary.upsert({
        where: {hash_summaryId: txToSave},
        create: txToSave,
        update: txToSave
      }))
    }

    for (const itx of internalTransactions) {
      const internalTxToSave = {internalTxId: itx.internalTxId, summaryId}
      queries.push(prismaClient.internal_transaction_in_summary.upsert({
        where: {internalTxId_summaryId: internalTxToSave},
        create: internalTxToSave,
        update: internalTxToSave
      }))
    }

    for (const address of addresses) {
      const addressToSave = {address: address.address, summaryId}
      queries.push(prismaClient.address_in_summary.upsert({
        where: {address_summaryId: addressToSave},
        create: addressToSave,
        update: addressToSave
      }))
    }

    for (const tokenId of tokenAddressesIds) {
      const tokenToSave = {tokenId, summaryId}
      queries.push(prismaClient.token_address_in_summary.upsert({
        where: {tokenId_summaryId: tokenToSave},
        create: tokenToSave,
        update: tokenToSave
      }))
    }

    for (const event of events) {
      const eventToSave = {eventId: event.eventId, summaryId}
      queries.push(prismaClient.event_in_summary.upsert({
        where: {eventId_summaryId: eventToSave},
        create: eventToSave,
        update: eventToSave
      }))
    }

    for (const suicide of suicides) {
      const suicideToSave = {internalTxId: suicide.internalTxId, summaryId}
      queries.push(prismaClient.suicide_in_summary.upsert({
        where: {internalTxId_summaryId: suicideToSave},
        create: suicideToSave,
        update: suicideToSave
      }))
    }

    await prismaClient.$transaction(queries)
  },
  async deleteOne (query, collection) {
    const deleted = await prismaClient.block_summary.delete({where: query})

    return deleted
  }
}

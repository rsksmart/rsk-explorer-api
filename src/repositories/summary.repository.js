import { generateFindQuery } from './utils'
import { rawBlockSummaryToEntity, summaryEntityToRaw } from '../converters/summary.converters'
import { summaryRelatedTables } from './includeRelatedTables'

export function getSummaryRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const summary = await prismaClient.block_summary.findFirst(generateFindQuery(query, project, summaryRelatedTables))

      return summary ? summaryEntityToRaw(summary) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
      const summaries = await prismaClient.block_summary.findMany(generateFindQuery(query, project, summaryRelatedTables, sort, limit))

      return Object.keys(project).length ? summaries : summaries.map(summaryEntityToRaw)
    },
    async countDocuments (query = {}) {
      const count = await prismaClient.block_summary.count({where: query})

      return count
    },
    insertOne (summary) {
      const { transactions, internalTransactions, addresses, tokenAddresses, events, suicides, block } = summary
      const { number: blockNumber, hash, timestamp } = block

      const newBlockSummary = rawBlockSummaryToEntity({ blockNumber, hash, timestamp })
      const newTxs = transactions.map(({ hash }) => ({ blockNumber, hash }))
      const newItxs = internalTransactions.map(({ internalTxId }) => ({ blockNumber, internalTxId }))
      const newTokenAddresses = tokenAddresses.map(({ address, contract, block: { number: blockNumber } }) => ({ address, contract, blockNumber }))
      const newEvents = events.map(({ eventId }) => ({ blockNumber, eventId }))
      const newContractSuicides = suicides.map(({ internalTxId }) => ({ blockNumber, internalTxId }))
      const newAddresses = addresses.map(({ address, blockNumber, balance, lastBlockMined }) => ({ address, blockNumber, balance, lastBlockMined: lastBlockMined ? lastBlockMined.number : undefined }))

      const transactionQueries = [
        prismaClient.block_summary.createMany({ data: newBlockSummary, skipDuplicates: true }),
        prismaClient.transaction_in_summary.createMany({ data: newTxs, skipDuplicates: true }),
        prismaClient.internal_transaction_in_summary.createMany({ data: newItxs, skipDuplicates: true }),
        prismaClient.token_address_in_summary.createMany({data: newTokenAddresses, skipDuplicates: true}),
        prismaClient.event_in_summary.createMany({data: newEvents, skipDuplicates: true}),
        prismaClient.suicide_in_summary.createMany({data: newContractSuicides, skipDuplicates: true}),
        prismaClient.address_in_summary.createMany({ data: newAddresses, skipDuplicates: true })
      ]

      return transactionQueries
    },
    async deleteOne (query) {
      const deleted = await prismaClient.block_summary.delete({where: query})

      return deleted
    }
  }
}

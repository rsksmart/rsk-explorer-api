import { rawReceiptToEntity, rawTxToEntity, transactionEntityToRaw } from '../converters/tx.converters'
import { generateFindQuery } from './utils'
import { txRelatedTables } from './includeRelatedTables'

export function getTxRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const txToReturn = await prismaClient.transaction.findFirst(generateFindQuery(query, project, txRelatedTables, project))

      return txToReturn ? transactionEntityToRaw(txToReturn) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
      const txs = await prismaClient.transaction.findMany(generateFindQuery(query, project, txRelatedTables, sort, limit))

      return txs.map(transactionEntityToRaw)
    },
    async countDocuments (query = {}) {
      const count = await prismaClient.transaction.count({where: query})

      return count
    },
    async deleteMany (filter) {
      const deleted = await prismaClient.transaction.deleteMany({where: filter})

      return deleted
    },
    insertOne (data) {
      return [prismaClient.transaction.create({
        data: {
          ...rawTxToEntity(data),
          receipt: { create: rawReceiptToEntity(data.receipt) }
        }
      })]
    }
  }
}

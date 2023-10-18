import { rawTxToEntity, transactionEntityToRaw } from '../converters/tx.converters'
import { generateFindQuery } from './utils'

export function getTxRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const txToReturn = await prismaClient.transaction.findFirst(generateFindQuery(query, project, {}, project))

      return txToReturn ? transactionEntityToRaw(txToReturn) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
      const txs = await prismaClient.transaction.findMany(generateFindQuery(query, project, {}, sort, limit))

      return txs.map(transactionEntityToRaw)
    },
    async countDocuments (query = {}) {
      return prismaClient.transaction.count({where: query})
    },
    async deleteMany (filter) {
      return prismaClient.transaction.deleteMany({where: filter})
    },
    insertOne (data) {
      return [prismaClient.transaction.create({ data: rawTxToEntity(data) })]
    }
  }
}

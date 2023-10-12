import {
  internalTxEntityToRaw,
  rawInternalTransactionToEntity
} from '../converters/internalTx.converters'
import { generateFindQuery } from './utils'

export function getInternalTxRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const internalTx = await prismaClient.internal_transaction.findFirst(generateFindQuery(query, project, {}, project))

      return internalTx ? internalTxEntityToRaw(internalTx) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
      const internalTxs = await prismaClient.internal_transaction.findMany(generateFindQuery(query, project, {}, sort, limit))

      return internalTxs.map(itx => internalTxEntityToRaw(itx))
    },
    async countDocuments (query = {}) {
      return prismaClient.internal_transaction.count({ where: query })
    },
    insertOne (data) {
      return [prismaClient.internal_transaction.create({ data: rawInternalTransactionToEntity(data) })]
    }
  }
}

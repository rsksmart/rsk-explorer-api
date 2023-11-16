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
    async find (query = {}, project = {}, sort = {}, limit = 0, { isForGetInternalTransactionsByAddress }) {
      let internalTxs

      if (isForGetInternalTransactionsByAddress) {
        internalTxs = await prismaClient.address_in_itx.findMany(generateFindQuery(query, project, { internal_transaction: true }, sort, limit))

        return internalTxs.map(itx => internalTxEntityToRaw(itx.internal_transaction))
      } else {
        internalTxs = await prismaClient.internal_transaction.findMany(generateFindQuery(query, project, {}, sort, limit))

        return internalTxs.map(itx => internalTxEntityToRaw(itx))
      }
    },
    async countDocuments (query = {}, { isForGetInternalTransactionsByAddress } = {}) {
      if (isForGetInternalTransactionsByAddress) {
        return prismaClient.address_in_itx.count({ where: query })
      } else {
        return prismaClient.internal_transaction.count({ where: query })
      }
    },
    insertOne (itx) {
      const transactionQueries = []
      const { action: { from, to }, internalTxId } = itx
      transactionQueries.push(prismaClient.internal_transaction.create({ data: rawInternalTransactionToEntity(itx) }))

      if (from) transactionQueries.push(prismaClient.address_in_itx.create({ data: { address: from, role: 'from', internalTxId } }))
      if (to) transactionQueries.push(prismaClient.address_in_itx.create({ data: { address: to, role: 'to', internalTxId } }))

      return transactionQueries
    }
  }
}

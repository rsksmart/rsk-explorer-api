import {
  internalTxEntityToRaw,
  rawActionToEntity,
  rawInternalTransactionResultToEntity,
  rawInternalTransactionToEntity,
  rawTraceAddressToEntity
} from '../converters/internalTx.converters'
import { internalTxRelatedTables } from './includeRelatedTables'
import { generateFindQuery } from './utils'

export function getInternalTxRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const internalTx = await prismaClient.internal_transaction.findFirst(generateFindQuery(query, project, internalTxRelatedTables, project))

      return internalTx ? internalTxEntityToRaw(internalTx) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
      const internalTxs = await prismaClient.internal_transaction.findMany(generateFindQuery(query, project, internalTxRelatedTables, sort, limit))

      return internalTxs.map(itx => internalTxEntityToRaw(itx))
    },
    async countDocuments (query = {}) {
      const count = await prismaClient.internal_transaction.count({
        where: query
      })

      return count
    },
    async deleteMany (filter) {
      const itxsToDelete = await prismaClient.internal_transaction.findMany({ where: filter })

      await prismaClient.internal_transaction.deleteMany({ where: filter })

      const deletedItxsData = await Promise.all(itxsToDelete.map(async (itx) => {
        const { actionId, resultId } = itx

        await prismaClient.action.deleteMany({ where: { id: actionId } })
        await prismaClient.internal_transaction_result.deleteMany({ where: { id: resultId } })

        return itx
      }))

      return deletedItxsData
    },
    insertOne (data) {
      const {action, traceAddress, result} = data
      const internalTxToSave = rawInternalTransactionToEntity(data)

      const query = prismaClient.internal_transaction.create({
        data: {
          ...internalTxToSave,
          action: {create: rawActionToEntity(action)},
          internal_transaction_result: {create: result ? rawInternalTransactionResultToEntity(result) : {}},
          trace_address: {createMany: {data: traceAddress.map(rawTraceAddressToEntity), skipDuplicates: true}}
        }
      })

      return [query]
    }
  }
}

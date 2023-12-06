import {rawTxPendingToEntity, rawTxInPoolToEntity} from '../converters/txPending.converters'
import { generateFindQuery } from './utils'

export function getTxPendingRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const txPending = await prismaClient.transaction_pending.findFirst(generateFindQuery(query, project, {}, project))

      return txPending
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
      const txsPending = await prismaClient.transaction_pending.findMany(generateFindQuery(query, project, {}, sort, limit))

      return txsPending
    },
    deleteOne (query) {
      return [prismaClient.transaction_pending.deleteMany({where: query})]
    },
    async upsertOne (filter, { tx, poolId }) {
      const newTxPending = rawTxPendingToEntity(tx)

      const txPending = await prismaClient.$transaction([
        prismaClient.transaction_pending.upsert({where: filter, update: newTxPending, create: newTxPending}),
        prismaClient.transaction_in_pool.create({data: rawTxInPoolToEntity({...tx, poolId})})
      ])

      return txPending
    }
  }
}

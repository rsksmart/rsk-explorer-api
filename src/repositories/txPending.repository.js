import { prismaClient } from '../lib/Setup'
import {rawTxPendingToEntity, rawTxInPoolToEntity} from '../converters/txPending.converters'
import { generateFindQuery } from './utils'

export const txPendingRepository = {
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
  async updateOne (filter, update) {
    const {$set: data, poolId} = update
    const newTxPending = rawTxPendingToEntity(data)

    const txPending = await prismaClient.$transaction([
      prismaClient.transaction_pending.upsert({where: filter, update: newTxPending, create: newTxPending}),
      prismaClient.transaction_in_pool.create({data: rawTxInPoolToEntity({...data, poolId})})
    ])

    return txPending
  }
}

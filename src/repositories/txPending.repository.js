import { prismaClient } from '../lib/Setup'
import {rawTxPendingToEntity, rawTxInPoolToEntity} from '../converters/txPending.converters'
import { mongoQueryToPrisma } from './utils'

export const txPendingRepository = {
  async findOne (query = {}, project = {}, collection) {
    const txPending = await prismaClient.transaction_pending.findFirst({where: mongoQueryToPrisma(query)})

    return txPending
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const txsPending = await prismaClient.transaction_pending.findMany({where: mongoQueryToPrisma(query)})

    return txsPending
  },
  async deleteOne (query, collection) {
    await prismaClient.transaction_pending.deleteMany({where: query})

    const mongoRes = await collection.deleteOne(query)
    return mongoRes
  },
  async updateOne (filter, update, options = {}, collection) {
    const {$set: data, poolId} = update
    const newTxPending = rawTxPendingToEntity(data)

    await prismaClient.$transaction([
      prismaClient.transaction_pending.upsert({where: filter, update: newTxPending, create: newTxPending}),
      prismaClient.transaction_in_pool.create({data: rawTxInPoolToEntity({...data, poolId})})
    ])

    delete update.poolId
    const mongoRes = await collection.updateOne(filter, update, options)
    return mongoRes
  }
}

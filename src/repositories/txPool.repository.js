import { prismaClient } from '../lib/Setup'
import {rawTxPoolToEntity} from '../converters/txPending.converters'
import {mongoQueryToPrisma} from './utils'

export const txPoolRepository = {
  async findOne (query = {}, project = {}, collection) {
    const txPool = await prismaClient.txpool.findFirst({
      where: mongoQueryToPrisma(query),
      orderBy: {id: 'desc'},
      include: {transaction_in_pool: true}
    })

    if (txPool) {
      txPool.txs = [...txPool.transaction_in_pool]
      delete txPool.transaction_in_pool

      txPool._id = txPool.id
      delete txPool.id

      txPool.timestamp = Number(txPool.timestamp)
    }

    return txPool
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    let txPools = await prismaClient.txpool.findMany({
      where: query,
      orderBy: {timestamp: 'desc'},
      include: {transaction_in_pool: true},
      take: limit
    })

    txPools = txPools.map(txPool => {
      txPool.txs = [...txPool.transaction_in_pool]
      delete txPool.transaction_in_pool

      txPool._id = txPool.id
      delete txPool.id

      txPool.timestamp = Number(txPool.timestamp)

      return txPool
    })

    return txPools
  },
  async insertOne (data, collection) {
    const txpool = await prismaClient.txpool.create({data: rawTxPoolToEntity(data)})

    const mongoRes = await collection.insertOne(data)
    return {...mongoRes, id: txpool.id}
  }
}

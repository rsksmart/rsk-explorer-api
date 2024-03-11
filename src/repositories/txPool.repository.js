import {rawTxPoolToEntity} from '../converters/txPending.converters'
import {generateFindQuery} from './utils'
import { txPoolRelatedTables } from './includeRelatedTables'

export function getTxPoolRepository (prismaClient) {
  return {
    async findOne (query = {}, select = {}, include = txPoolRelatedTables, orderBy = { id: 'desc' }) {
      const txPool = await prismaClient.tx_pool.findFirst(generateFindQuery(query, select, include, orderBy))

      if (txPool) {
        txPool.txs = [...txPool.transaction_in_pool]
        delete txPool.transaction_in_pool

        txPool._id = txPool.id
        delete txPool.id

        txPool.timestamp = Number(txPool.timestamp)
      }

      return txPool
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
      let txPools = await prismaClient.tx_pool.findMany(generateFindQuery(query, project, txPoolRelatedTables, { timestamp: -1 }, limit))

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
    async insertOne (data) {
      const txpool = await prismaClient.tx_pool.create({data: rawTxPoolToEntity(data)})

      return txpool
    }
  }
}

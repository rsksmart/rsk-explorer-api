import {generateFindQuery} from './utils'
import { txPoolRelatedTables } from './includeRelatedTables'
import { rawTxPoolToEntity, txPoolEntityToRaw } from '../converters/txPool.converters'

// Fix to prevent txs field from being fetched until prisma adds support for excluded selection values (eg: { txs: false })
// See: https://github.com/prisma/prisma/issues/5042
// Tx pool related tables are included in the select in this case
const txPoolSelect = {
  id: true,
  blockNumber: true,
  pending: true,
  queued: true,
  timestamp: true,
  // txs: true,
  ...txPoolRelatedTables
}

export function getTxPoolRepository (prismaClient) {
  return {
    async findOne (query = {}, select = txPoolSelect, include = txPoolRelatedTables, orderBy = { id: 'desc' }) {
      // Include disabled. Cannot use 'include' and 'select' statements at the same time
      include = undefined
      const txPool = await prismaClient.tx_pool.findFirst(generateFindQuery(query, select, include, orderBy))
      return txPool ? txPoolEntityToRaw(txPool) : null
    },
    async find (query = {}, select = txPoolSelect, include = txPoolRelatedTables, orderBy = { timestamp: 'desc' }, limit = 0) {
      // Include disabled. Cannot use 'include' and 'select' statements at the same time
      include = undefined

      const txPools = await prismaClient.tx_pool.findMany(generateFindQuery(query, select, include, orderBy, limit))
      return txPools.map(txPoolEntityToRaw)
    },
    async insertOne (data) {
      return prismaClient.tx_pool.create({ data: rawTxPoolToEntity(data) })
    }
  }
}

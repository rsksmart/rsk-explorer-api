import { rawBridgeToEntity, rawCirculatingToEntity, rawStatsToEntity, statsEntityToRaw } from '../converters/stats.converters'
import {prismaClient} from '../lib/Setup'
import { generateFindQuery, mongoQueryToPrisma } from './utils'

const statsEntitySelect = {
  circulating: {
    select: {
      circulatingSupply: true,
      totalSupply: true,
      bridgeBalance: true
    }
  },
  activeAccounts: true,
  hashrate: true,
  timestamp: true,
  blockHash: true,
  blockNumber: true,
  bridge: {
    select: { lockingCap: true }
  }
}

export const statsRepository = {
  async findOne (query = {}, project = {}, collection) {
    const stats = await prismaClient.stats.findFirst(generateFindQuery(query, statsEntitySelect, {}, project))

    return stats ? statsEntityToRaw(stats) : null
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const statsArr = await prismaClient.stats.findMany(generateFindQuery(query, statsEntitySelect, {}, sort, limit))

    return statsArr.map(stats => statsEntityToRaw(stats))
  },
  async countDocuments (query = {}, collection) {
    const count = await prismaClient.stats.count({
      where: mongoQueryToPrisma(query)
    })

    return count
  },
  async insertOne (data, collection) {
    const newStats = rawStatsToEntity(data)

    if (data.circulating) {
      const newCirculating = await prismaClient.circulating.create({ data: rawCirculatingToEntity(data.circulating) })
      newStats.circulatingId = newCirculating.id
    }

    const newBridge = await prismaClient.bridge.create({ data: rawBridgeToEntity(data.bridge) })
    newStats.bridgeId = newBridge.id

    await prismaClient.stats.create({ data: newStats })
  }
}

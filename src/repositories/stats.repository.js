import { rawStatsToEntity, statsEntityToRaw } from '../converters/stats.converters'
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
  async insertOne (data) {
    try {
      const newStats = rawStatsToEntity(data)

      await prismaClient.stats.upsert({
        where: { blockNumber: newStats.blockNumber },
        create: newStats,
        update: newStats
      })
    } catch (error) {
      console.log('Error at statsRepository.insertOne():', error)
      console.log({ data })
    }
  }
}

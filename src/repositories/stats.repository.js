import { rawStatsToEntity, statsEntityToRaw } from '../converters/stats.converters'
import { generateFindQuery } from './utils'

export function getStatsRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const stats = await prismaClient.stats.findFirst(generateFindQuery(query, {}, {}, project))

      return stats ? statsEntityToRaw(stats) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
      const statsArr = await prismaClient.stats.findMany(generateFindQuery(query, {}, {}, sort, limit))

      return statsArr.map(stats => statsEntityToRaw(stats))
    },
    async countDocuments (query = {}) {
      const count = await prismaClient.stats.count({
        where: query
      })

      return count
    },
    insertOne (data) {
      return prismaClient.stats.createMany({ data: [rawStatsToEntity(data)], skipDuplicates: true })
    }
  }
}

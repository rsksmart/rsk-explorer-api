import { rawStatsToEntity, statsEntityToRaw } from '../converters/stats.converters'
import {prismaClient} from '../lib/Setup'
import { generateFindQuery, mongoQueryToPrisma } from './utils'

export const statsRepository = {
  async findOne (query = {}, project = {}, collection) {
    const stats = await prismaClient.stats.findFirst(generateFindQuery(query, {}, {}, project))

    return stats ? statsEntityToRaw(stats) : null
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const statsArr = await prismaClient.stats.findMany(generateFindQuery(query, {}, {}, sort, limit))

    return statsArr.map(stats => statsEntityToRaw(stats))
  },
  async countDocuments (query = {}, collection) {
    const count = await prismaClient.stats.count({
      where: mongoQueryToPrisma(query)
    })

    return count
  },
  insertOne (data) {
    return prismaClient.stats.createMany({ data: [rawStatsToEntity(data)], skipDuplicates: true })
  }
}

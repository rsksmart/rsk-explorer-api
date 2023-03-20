import { rawStatusToEntity, statusEntityToRaw } from '../converters/status.converters'
import {prismaClient} from '../lib/Setup'
import { createPrismaOrderBy, mongoQueryToPrisma } from './utils'

const statsEntitySelect = {
  pendingBlocks: true,
  requestingBlocks: true,
  nodeDown: true,
  timestamp: true
}

export const statusRepository = {
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const statusArr = await prismaClient.status.findMany({
      where: mongoQueryToPrisma(query),
      select: statsEntitySelect,
      orderBy: createPrismaOrderBy(sort),
      take: limit
    })

    return statusArr.map(status => statusEntityToRaw(status))
  },
  async insertOne (data, collection) {
    await prismaClient.status.create({ data: rawStatusToEntity(data) })
    await collection.insertOne(data)
  }
}

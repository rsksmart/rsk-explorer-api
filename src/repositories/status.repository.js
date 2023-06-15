import { rawStatusToEntity, statusEntityToRaw } from '../converters/status.converters'
import {prismaClient} from '../lib/Setup'
import { generateFindQuery } from './utils'

const statsEntitySelect = {
  pendingBlocks: true,
  requestingBlocks: true,
  nodeDown: true,
  timestamp: true
}

export const statusRepository = {
  async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
    const statusArr = await prismaClient.status.findMany(generateFindQuery(query, statsEntitySelect, {}, sort, limit))

    return statusArr.map(status => statusEntityToRaw(status))
  },
  insertOne (data) {
    return [prismaClient.status.create({ data: rawStatusToEntity(data) })]
  }
}

import { rawStatusToEntity } from '../converters/status.converters'
import {prismaClient} from '../lib/Setup'

export const statusRepository = {
  findOne (query = {}, project = {}, collection) {
    return collection.findOne(query, project)
  },
  find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    if (isArray) {
      return collection
        .find(query, project)
        .sort(sort)
        .limit(limit)
        .toArray()
    } else {
      return collection
        .find(query, project)
        .sort(sort)
        .limit(limit)
    }
  },
  async insertOne (data, collection) {
    await prismaClient.status.create({ data: rawStatusToEntity(data) })
    await collection.insertOne(data)
  }
}

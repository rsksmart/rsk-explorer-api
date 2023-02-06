import {prismaClient} from '../lib/Setup'
import {rawBlockToEntity} from '../converters/block.converters'

export const blockRepository = {
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
  countDocuments (query = {}, collection) {
    return collection.countDocuments(query)
  },
  aggregate (aggregate, collection) {
    return collection.aggregate(aggregate).toArray()
  },
  async insertOne (data, collection) {
    await prismaClient.block.create({data: rawBlockToEntity(data)})
    const mongoRes = await collection.insertOne(data)
    return mongoRes
  },
  updateOne (filter, update, options = {}, collection) {
    return collection.updateOne(filter, update, options)
  },
  deleteMany (filter, collection) {
    return collection.deleteMany(filter)
  }
}

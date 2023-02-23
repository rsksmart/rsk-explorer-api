import {prismaClient} from '../lib/Setup'
import {rawAddressToEntity} from '../converters/address.converters'

export const addressRepository = {
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
  async updateOne (filter, update, options = {}, collection) {
    const {$set: data} = update
    const newAddress = rawAddressToEntity(data)
    await prismaClient.address.upsert({ where: filter, update: newAddress, create: newAddress })

    const mongoRes = await collection.updateOne(filter, update, options)
    return mongoRes
  },
  async deleteMany (filter, collection) {
    const mongoRes = await collection.deleteMany(filter)
    return mongoRes
  },
  insertOne (data, collection) {
    return collection.insertOne(data)
  }
}

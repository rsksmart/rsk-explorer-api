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
    try {
      const {$set: data} = update
      const thisType = {
        type: data.type,
        entity: 'address'
      }
      let existingType = await prismaClient.type.findFirst({where: thisType})
      if (!existingType) {
        existingType = await prismaClient.type.create({data: thisType})
      }
      const newAddress = rawAddressToEntity({typeId: existingType.id, ...data})
      await prismaClient.address.upsert({ where: filter, update: newAddress, create: newAddress })
    } catch (e) {
      console.log(e)
    }
    const mongoRes = await collection.updateOne(filter, update, options)

    return mongoRes
  },
  deleteMany (filter, collection) {
    return collection.deleteMany(filter)
  },
  insertOne (data, collection) {
    return collection.insertOne(data)
  }
}

import {prismaClient} from '../lib/Setup'
import {rawBlockToEntity} from '../converters/block.converters'
import {mongoSortToPrisma} from "./utils"
import {blockEntityToRaw} from '../converters/readings/block.converters.readings'

export const blockRepository = {
  async findOne (query = {}, project = {}, collection) {
    const orderBy = []

    if (project.sort) {
      const sort = Object.entries(project.sort)[0]
      let param = sort[0]
      const value = mongoSortToPrisma(sort[1])

      if (param === '_received') {
        param = 'received'
      }

      const prismaSort = {
        [param]: value
      }

      orderBy.push(prismaSort)
    }

    const requestedBlock = await prismaClient.block.findFirst({
      where: query,
      orderBy: orderBy,
      include: {
        uncle: {
          select: {
            hash: true
          }
        }
      }
    })

    return requestedBlock ? blockEntityToRaw(requestedBlock) : null
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

import {prismaClient} from '../lib/Setup'
import {rawBlockToEntity, blockEntityToRaw} from '../converters/block.converters'
import {createPrismaOrderBy, mongoQueryToPrisma} from './utils'

const blockRelatedTables = {
  uncle: {select: {hash: true}},
  transaction_transaction_block_numberToblock: {select: {hash: true}}
}

export const blockRepository = {
  async findOne (query = {}, project = {}, collection) {
    const blockToReturn = await prismaClient.block.findFirst({
      where: mongoQueryToPrisma(query),
      orderBy: createPrismaOrderBy(project),
      include: blockRelatedTables
    })

    return blockToReturn ? blockEntityToRaw(blockToReturn) : null
  },
  async find (query = {}, select = {}, collection, sort = {}, limit = 0, isArray = true) {
    const options = {
      where: mongoQueryToPrisma(query),
      orderBy: createPrismaOrderBy(sort),
      take: limit
    }

    if (Object.keys(select).length) {
      options.select = select
    } else {
      options.include = blockRelatedTables
    }

    const blocks = await prismaClient.block.findMany(options)

    return blocks.map(blockEntityToRaw)
  },
  async countDocuments (query = {}, collection) {
    const count = await prismaClient.block.count({where: mongoQueryToPrisma(query)})

    return count
  },
  async insertOne (data, collection) {
    await prismaClient.block.create({data: rawBlockToEntity(data)})
    for (const uncle of data.uncles) {
      await prismaClient.uncle.create({data: {hash: uncle, blockNumber: data.number}})
    }

    const mongoRes = await collection.insertOne(data)
    return mongoRes
  },
  updateOne (filter, update, options = {}, collection) {
    return collection.updateOne(filter, update, options)
  },
  async deleteMany (filter, collection) {
    const mongoRes = await collection.deleteMany(filter)
    return mongoRes
  }
}

import {prismaClient} from '../lib/Setup'
import {rawBlockToEntity, blockEntityToRaw} from '../converters/block.converters'
import {generateFindQuery, mongoQueryToPrisma} from './utils'
import { blockRelatedTables } from './includeRelatedTables'

export const blockRepository = {
  async findOne (query = {}, project = {}, collection) {
    query = generateFindQuery(query, project, blockRelatedTables, project)
    const block = await prismaClient.block.findFirst(query)

    if (block) {
      return Object.keys(project).length ? block : blockEntityToRaw(block)
    } else {
      return null
    }
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const blocks = await prismaClient.block.findMany(generateFindQuery(query, project, blockRelatedTables, sort, limit))

    return Object.keys(project).length ? blocks : blocks.map(blockEntityToRaw)
  },
  async countDocuments (query = {}, collection) {
    const count = await prismaClient.block.count({where: mongoQueryToPrisma(query)})

    return count
  },
  async insertOne (data, collection) {
    const block = await prismaClient.block.create({data: rawBlockToEntity(data)})
    for (const uncle of data.uncles) {
      await prismaClient.uncle.create({data: {hash: uncle, blockNumber: data.number}})
    }

    return block
  },
  async deleteMany (filter, collection) {
    const deleted = await prismaClient.block.deleteMany({where: mongoQueryToPrisma(filter)})

    return deleted
  }
}

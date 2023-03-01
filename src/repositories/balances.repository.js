import { prismaClient } from '../lib/Setup'
import { rawBalanceToEntity } from '../converters/balance.converters'
// import { mongoSortToPrisma } from './utils'
import { createPrismaOrderBy, createPrismaSelect } from './utils'

export const balancesRepository = {
  async findOne (query = {}, project = {}, collection) {
    const orderBy = createPrismaOrderBy(project)
    const select = createPrismaSelect(project)
    let prismaResult = {}
    if (Object.keys(select).length !== 0) {
      prismaResult = await prismaClient.balance.findFirst({
        where: query,
        orderBy: orderBy,
        select: select
      })
    } else {
      prismaResult = await prismaClient.balance.findFirst({
        where: query,
        orderBy: orderBy
      })
    }
    return prismaResult
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
  async deleteMany (filter, collection) {
    const prismaRes = await prismaClient.balance.deleteMany({where: filter})
    const mongoRes = await collection.deleteMany(filter)
    return mongoRes
  },
  async insertMany (data, collection) {
    const balancesToSave = data.map(balance => rawBalanceToEntity(balance))
    await prismaClient.balance.createMany({data: balancesToSave})

    const mongoRes = await collection.insertMany(data)
    return mongoRes
  }
}

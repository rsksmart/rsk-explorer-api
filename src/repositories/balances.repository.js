import { prismaClient } from '../lib/Setup'
import { rawBalanceToEntity, entityToRawBalance } from '../converters/balance.converters'
import { createPrismaOrderBy, createPrismaSelect, mongoQueryToPrisma } from './utils'

export const balancesRepository = {
  async findOne (query = {}, project = {}, collection) {
    const balance = await prismaClient.balance.findFirst({
      where: mongoQueryToPrisma(query),
      select: createPrismaSelect(project),
      orderBy: createPrismaOrderBy(project)
    })
    
    return balance ? entityToRawBalance(balance) : null
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const balances = await prismaClient.balance.findMany({
      where: mongoQueryToPrisma(query),
      select: createPrismaSelect(project),
      orderBy: createPrismaOrderBy(sort),
      take: limit
    })

    return balances ? balances.map(entityToRawBalance) : null
  },
  async countDocuments (query = {}, collection) {
    const count = await prismaClient.balance.count({where: mongoQueryToPrisma(query)})

    return count
  },
  async deleteMany (filter, collection) {
    const deleted = await prismaClient.balance.deleteMany({where: mongoQueryToPrisma(filter)})
    await collection.deleteMany(filter)

    return deleted
  },
  async insertMany (data, collection) {
    const balancesToSave = data.map(balance => rawBalanceToEntity(balance))
    const savedBalance = await prismaClient.balance.createMany({data: balancesToSave})

    await collection.insertMany(data)
    return savedBalance
  }
}

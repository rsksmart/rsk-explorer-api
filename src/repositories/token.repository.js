import { rawTokenToEntity, tokenEntityToRaw } from '../converters/token.converters'
import { prismaClient } from '../lib/Setup'
import { generateFindQuery, mongoQueryToPrisma } from './utils'

export const tokenRepository = {
  async findOne (query = {}, project = {}, collection) {
    const token = await prismaClient.token_address.findFirst(generateFindQuery(query, project, {}, project))

    return token ? tokenEntityToRaw(token) : null
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const tokens = await prismaClient.token_address.findMany(generateFindQuery(query, project, {}, sort, limit))

    return tokens.map(tokenEntityToRaw)
  },
  async countDocuments (query = {}, collection) {
    const count = await prismaClient.token_address.count({where: mongoQueryToPrisma(query)})

    return count
  },
  aggregate (aggregate, collection) {
    return collection.aggregate(aggregate).toArray()
  },
  async updateOne (filter, update, options = {}, collection) {
    const {$set: data} = update
    const tokenToCreate = data.id ? rawTokenToEntity(data) : {}
    const updatedToken = await prismaClient.token_address.upsert({where: filter, update: {balance: data.balance}, create: tokenToCreate})

    return updatedToken
  }
}

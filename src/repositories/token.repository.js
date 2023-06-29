import { addressEntityToRaw } from '../converters/address.converters'
import { rawTokenToEntity, tokenEntityToRaw } from '../converters/token.converters'
import { prismaClient } from '../lib/Setup'
import { addressRelatedTables } from './includeRelatedTables'
import { generateFindQuery } from './utils'

export const tokenRepository = {
  async findOne (query = {}, project = {}) {
    const token = await prismaClient.token_address.findFirst(generateFindQuery(query, project, {}, project))

    return token ? tokenEntityToRaw(token) : null
  },
  async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
    const tokens = await prismaClient.token_address.findMany(generateFindQuery(query, project, {}, sort, limit))

    return tokens.map(tokenEntityToRaw)
  },
  async countDocuments (query = {}) {
    const count = await prismaClient.token_address.count({where: query})

    return count
  },
  async aggregate (query) {
    const tokensByAddress = []
    await prismaClient.$transaction(async prisma => {
      const tokens = await prisma.token_address.findMany({where: query})

      for (const token of tokens) {
        const contract = await prisma.address.findFirst({where: {address: token.contract}, include: addressRelatedTables})
        delete contract.address
        tokensByAddress.push({...addressEntityToRaw(contract), ...token})
      }
    })

    return tokensByAddress
  },
  insertOne (data) {
    return [prismaClient.token_address.createMany({data: rawTokenToEntity(data), skipDuplicates: true})]
  }
}

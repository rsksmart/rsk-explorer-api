import { rawTokenToEntity, tokenEntityToRaw, tokensByAddressEntityToRaw } from '../converters/token.converters'
import { addressRelatedTables } from './includeRelatedTables'
import { generateFindQuery } from './utils'

export function getTokenRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const token = await prismaClient.token_address.findFirst(generateFindQuery(query, project, {}, project))

      return token ? tokenEntityToRaw(token) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, { isForGetTokensByAddress } = {}) {
      if (isForGetTokensByAddress) {
        const include = { contract_token_address_contractTocontract: { include: addressRelatedTables() } }
        const tokensByAddress = await prismaClient.token_address.findMany(generateFindQuery(query, {}, include, sort, limit))

        return tokensByAddress.map(token => tokensByAddressEntityToRaw(token, token.contract_token_address_contractTocontract))
      } else {
        const tokens = await prismaClient.token_address.findMany(generateFindQuery(query, project, {}, sort, limit))

        return tokens.map(tokenEntityToRaw)
      }
    },
    async countDocuments (query = {}) {
      const count = await prismaClient.token_address.count({where: query})

      return count
    },
    insertOne (data) {
      return [prismaClient.token_address.createMany({data: rawTokenToEntity(data), skipDuplicates: true})]
    }
  }
}

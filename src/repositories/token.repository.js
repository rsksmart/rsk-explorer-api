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
        let tokensByAddress = await prismaClient.token_address.findMany(generateFindQuery(query, {}, include, { blockNumber: -1 }, limit))
        tokensByAddress = tokensByAddress.sort((t1, t2) => t2.blockNumber - t1.blockNumber)
        const tokensToReturn = []
        const latestTokens = {}

        for (const token of tokensByAddress) {
          if (!latestTokens[token.contract]) {
            latestTokens[token.contract] = true
            tokensToReturn.push(tokensByAddressEntityToRaw(token, token.contract_token_address_contractTocontract))
          }
        }

        return tokensToReturn
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

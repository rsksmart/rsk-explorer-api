import { rawTokenToEntity, tokenEntityToRaw, tokensByAddressEntityToRaw } from '../converters/token.converters'
import { addressRelatedTables } from './includeRelatedTables'
import { generateFindQuery } from './utils'
import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'

export function getTokenRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const token = await prismaClient.token_address.findFirst(generateFindQuery(query, project, {}, project))

      return token ? tokenEntityToRaw(token) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, { isForGetTokensByAddress, isForGetTokenAccounts } = {}) {
      if (isForGetTokensByAddress) {
        const address = query.address

        if (isAddress(address)) {
          const tokensByAddress = await prismaClient.$queryRaw`SELECT *
          FROM token_address t1
          WHERE t1.address = ${address}
          and t1.block_number = (
            SELECT MAX(t2.block_number)
            FROM token_address t2
            WHERE t1.address = t2.address and t1.contract = t2.contract
          );`

          const contracts = await prismaClient.address.findMany({ where: { address: { in: tokensByAddress.map(t => t.contract) } }, include: addressRelatedTables() })

          return tokensByAddress.map(token => {
            token.contract_relation = contracts.find(contract => contract.address === token.contract)
            return tokensByAddressEntityToRaw(token, token.contract_relation)
          })
        }
      } else if (isForGetTokenAccounts) {
        const contract = query.contract || query.address

        if (isAddress(contract)) {
          let tokensByAddress = await prismaClient.$queryRaw`SELECT *
          FROM token_address t1
          WHERE t1.contract = ${contract}
          and t1.block_number = (
            SELECT MAX(t2.block_number)
            FROM token_address t2
            WHERE t1.address = t2.address and t1.contract = t2.contract
          );`

          return tokensByAddress.map(token => {
            return tokenEntityToRaw({ blockNumber: token.block_number, blockHash: token.block_hash, ...token })
          })
        }
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
      return prismaClient.token_address.createMany({data: rawTokenToEntity(data), skipDuplicates: true})
    }
  }
}

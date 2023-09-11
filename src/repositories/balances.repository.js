import { rawBalanceToEntity, entityToRawBalance } from '../converters/balance.converters'
import { generateFindQuery } from './utils'

export function getBalancesRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      const balance = await prismaClient.balance.findFirst(generateFindQuery(query, project, {}, project))

      return balance ? entityToRawBalance(balance) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, isArray = true) {
      const balances = await prismaClient.balance.findMany(generateFindQuery(query, project, {}, sort, limit))

      return balances.map(entityToRawBalance)
    },
    async countDocuments (query = {}) {
      const count = await prismaClient.balance.count({where: query})

      return count
    },
    async deleteMany (filter) {
      const deleted = await prismaClient.balance.deleteMany({where: filter})

      return deleted
    },
    insertMany (data, latestBalances) {
      const balancesToSave = data.map(balance => rawBalanceToEntity(balance))
      const transactionQueries = [prismaClient.balance.createMany({data: balancesToSave, skipDuplicates: true})]

      if (latestBalances) {
        const addresses = latestBalances.balances.map(b => b.address)
        transactionQueries.push(prismaClient.address_latest_balance.deleteMany({
          where: {
            address: { in: addresses },
            blockNumber: { lt: latestBalances.blockNumber }
          }}
        ))
        transactionQueries.push(prismaClient.address_latest_balance.createMany({ data: latestBalances.balances, skipDuplicates: true }))
      }

      return transactionQueries
    }
  }
}

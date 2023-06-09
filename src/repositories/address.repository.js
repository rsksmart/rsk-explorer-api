import {prismaClient} from '../lib/Setup'
import {
  rawAddressToEntity,
  rawContractToEntity,
  addressEntityToRaw
} from '../converters/address.converters'
import { generateFindQuery, mongoQueryToPrisma } from './utils'
import { addressRelatedTables } from './includeRelatedTables'

export const addressRepository = {
  async findOne (query = {}, project = {}, collection) {
    const address = await prismaClient.address.findFirst(generateFindQuery(query, project, addressRelatedTables, project))

    return address ? addressEntityToRaw(address) : null
  },
  async find (query = {}, project = {}, collection, sort = {}, limit = 0, isArray = true) {
    const addresses = await prismaClient.address.findMany(generateFindQuery(query, project, addressRelatedTables, sort, limit))

    return addresses.map(addressEntityToRaw)
  },
  async countDocuments (query = {}, collection) {
    const count = await prismaClient.address.count({where: mongoQueryToPrisma(query)})

    return count
  },
  insertOne (data) {
    const transactionQueries = [prismaClient.address.createMany({ data: rawAddressToEntity(data), skipDuplicates: true })]

    if (data.type === 'contract') {
      const {contractMethods, contractInterfaces, totalSupply} = data

      const contractToSave = rawContractToEntity(data)

      transactionQueries.push(prismaClient.contract.createMany({data: contractToSave, skipDuplicates: true}))

      const {address: contractAddress} = contractToSave

      if (contractMethods) {
        const methodsToSave = contractMethods.map(method => ({ method, contractAddress }))
        transactionQueries.push(prismaClient.contract_method.createMany({ data: methodsToSave, skipDuplicates: true }))
      }

      if (contractInterfaces) {
        const interfacesToSave = contractInterfaces.map(inter => ({ interface: inter, contractAddress }))
        transactionQueries.push(prismaClient.contract_interface.createMany({ data: interfacesToSave, skipDuplicates: true }))
      }

      if (totalSupply) {
        const { blockNumber, totalSupply } = data
        transactionQueries.push(prismaClient.total_supply.createMany({data: {contractAddress, blockNumber, totalSupply}, skipDuplicates: true}))
      }
    }

    if (data.lastBlockMined) {
      transactionQueries.push(prismaClient.miner.createMany({data: {
        address: data.address,
        blockNumber: data.lastBlockMined.number
      },
      skipDuplicates: true}))
    }

    return transactionQueries
  },
  deleteMany (addresses, collection) {
    return [prismaClient.address.deleteMany({
      where: {
        address: { in: addresses }
      }
    })]
  }
}

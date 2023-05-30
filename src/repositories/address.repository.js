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
  updateOne (filter, update, options = {}, collection) {
    const {$set: data} = update
    const addressToSave = rawAddressToEntity(data)

    const transactionQueries = [prismaClient.address.upsert({ where: filter, update: addressToSave, create: addressToSave })]

    if (data.type === 'contract') {
      const {contractMethods, contractInterfaces} = data

      const contractToSave = rawContractToEntity(data)

      transactionQueries.push(prismaClient.contract.upsert({
        where: {address: contractToSave.address},
        create: contractToSave,
        update: contractToSave
      }))

      const {address: contractAddress} = contractToSave

      if (contractMethods) {
        const methodsToSave = contractMethods.map(method => ({method, contractAddress}))
        transactionQueries.push(prismaClient.contract_method.createMany({ data: methodsToSave, skipDuplicates: true }))
      }

      if (contractInterfaces) {
        const interfacesToSave = contractInterfaces.map(inter => ({interface: inter, contractAddress}))
        transactionQueries.push(prismaClient.contract_interface.createMany({ data: interfacesToSave, skipDuplicates: true }))
      }
    }

    return transactionQueries
  },
  async deleteMany (filter, collection) {
    const blockHash = filter['createdByTx.blockHash']
    const txs = await prismaClient.transaction.findMany({where: {blockHash}})

    const deleted = await prismaClient.address.deleteMany({
      where: {
        contract_contract_addressToaddress: {createdByTx: {in: txs.map(tx => tx.hash)}}
      }
    })

    return deleted
  }
}

import {prismaClient} from '../lib/Setup'
import {
  rawAddressToEntity,
  rawContractToEntity,
  addressEntityToRaw
} from '../converters/address.converters'
import { generateFindQuery, mongoQueryToPrisma } from './utils'

const addressRelatedTables = {
  block_address_last_block_minedToblock: true,
  contract_contract_addressToaddress: {
    include: {
      contract_method: {include: {method: {select: {method: true}}}},
      contract_interface: {include: {interface_: {select: {interface: true}}}}
    }
  }
}

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
  aggregate (aggregate, collection) {
    return collection.aggregate(aggregate).toArray()
  },
  async updateOne (filter, update, options = {}, collection) {
    const {$set: data} = update
    const addressToSave = rawAddressToEntity(data)

    const savedAddress = await prismaClient.address.upsert({ where: filter, update: addressToSave, create: addressToSave })

    if (data.type === 'contract') {
      const {createdByTx, createdByInternalTx, contractMethods, contractInterfaces} = data

      if (createdByTx) {
        if (createdByTx.transactionHash) {
          data.createdByInternalTx = createdByTx.transactionHash
          delete data.createdByTx
        } else if (createdByTx.hash) {
          data.createdByTx = createdByTx.hash
        }
      } else if (createdByInternalTx) {
        data.createdByInternalTx = createdByInternalTx
        delete data.createdByTx
      }

      const contractToSave = rawContractToEntity(data)
      const savedContract = await prismaClient.contract.upsert({where: {address: contractToSave.address}, create: contractToSave, update: contractToSave})

      if (contractMethods) {
        for (const method of contractMethods) {
          const savedMethod = await prismaClient.method.upsert({where: {method}, create: {method}, update: {}})
          const contractMethodToSave = {methodId: savedMethod.id, contractAddress: savedContract.address}
          await prismaClient.contract_method.upsert({
            where: {
              methodId_contractAddress: contractMethodToSave
            },
            create: contractMethodToSave,
            update: {}})
        }
      }

      if (contractInterfaces) {
        for (const interf of contractInterfaces) {
          const savedInterface = await prismaClient.interface_.upsert({where: {interface: interf}, create: {interface: interf}, update: {}})
          const contractInterfaceToSave = {interfaceId: savedInterface.id, contractAddress: savedContract.address}
          await prismaClient.contract_interface.upsert({
            where: {
              interfaceId_contractAddress: contractInterfaceToSave
            },
            create: contractInterfaceToSave,
            update: {}})
        }
      }
    }

    await collection.updateOne(filter, update, options)

    return savedAddress
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

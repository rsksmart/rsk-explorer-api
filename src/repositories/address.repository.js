import {
  rawAddressToEntity,
  rawContractToEntity,
  addressEntityToRaw
} from '../converters/address.converters'
import { generateFindQuery } from './utils'
import { addressRelatedTables } from './includeRelatedTables'

export function getAddressRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      let address = await prismaClient.address.findFirst(generateFindQuery(query, project, addressRelatedTables, project))

      return address ? addressEntityToRaw(address) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0) {
      const addresses = await prismaClient.address.findMany(generateFindQuery(query, project, addressRelatedTables, sort, limit))

      return addresses.map(addressEntityToRaw)
    },
    async countDocuments (query = {}) {
      const count = await prismaClient.address.count({where: query})

      return count
    },
    insertOne (data, { isMiner, number }) {
      const transactionQueries = [prismaClient.address.createMany({ data: rawAddressToEntity(data), skipDuplicates: true })]

      if (data.type === 'contract') {
        const {contractMethods, contractInterfaces, totalSupply, createdByTx} = data

        const contractToSave = rawContractToEntity(data)

        transactionQueries.push(prismaClient.contract.createMany({data: contractToSave, skipDuplicates: true}))

        const {address: contractAddress} = contractToSave

        if (createdByTx) {
          const createdByTxToSave = {
            contractAddress,
            timestamp: String(createdByTx.timestamp),
            tx: JSON.stringify(createdByTx)
          }

          transactionQueries.push(prismaClient.contract_creation_tx.createMany({ data: createdByTxToSave, skipDuplicates: true }))
        }

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

      if (isMiner) {
        transactionQueries.push(prismaClient.miner.createMany({data: {
          address: data.address,
          blockNumber: number
        },
        skipDuplicates: true}))
      }

      return transactionQueries
    },
    deleteMany (addresses) {
      return [prismaClient.address.deleteMany({
        where: {
          address: { in: addresses }
        }
      })]
    }
  }
}

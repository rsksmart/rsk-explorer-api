import {
  rawAddressToEntity,
  rawContractToEntity,
  addressEntityToRaw
} from '../converters/address.converters'
import { generateFindQuery } from './utils'
import { addressRelatedTables } from './includeRelatedTables'
import { addrTypes } from '../lib/types'

export function getAddressRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}, endpointOptions) {
      const address = await prismaClient.address.findFirst(generateFindQuery(query, project, addressRelatedTables(), project))

      return address ? addressEntityToRaw(address, endpointOptions) : null
    },
    async find (query = {}, project = {}, sort = {}, limit = 0, endpointOptions) {
      const addresses = await prismaClient.address.findMany(generateFindQuery(query, project, addressRelatedTables(), sort, limit))

      return addresses.map(address => addressEntityToRaw(address, endpointOptions))
    },
    async countDocuments (query = {}) {
      const count = await prismaClient.address.count({where: query})

      return count
    },
    insertOne (data, { isMiner, number }) {
      if (data.address === '0xd45b351a3929782747154edb160f8e14769c153b') console.dir({ pepe: data }, { depth: null })
      const transactionQueries = [prismaClient.address.createMany({ data: rawAddressToEntity(data), skipDuplicates: true })]
      const { destroyedByTx, address } = data

      if (isMiner) {
        transactionQueries.push(prismaClient.miner.createMany({data: {
          address: data.address,
          blockNumber: number
        },
        skipDuplicates: true}))
      }

      if (destroyedByTx) {
        transactionQueries.push(prismaClient.address.upsert({
          where: { address },
          create: rawAddressToEntity(data),
          update: { type: addrTypes.ADDRESS }
        }))

        const destroyedByTxToSave = {
          contractAddress: address,
          timestamp: String(destroyedByTx.timestamp),
          tx: JSON.stringify(destroyedByTx)
        }

        transactionQueries.push(prismaClient.contract_destruction_tx.createMany({ data: destroyedByTxToSave, skipDuplicates: true }))
        transactionQueries.push(...generateSaveContractQueries(data, prismaClient, true))
      }

      if (data.type === addrTypes.CONTRACT) {
        transactionQueries.push(...generateSaveContractQueries(data, prismaClient))
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

function generateSaveContractQueries (data, prismaClient, upserting) {
  const transactionQueries = []
  const contractToSave = rawContractToEntity(data)
  const { contractMethods, contractInterfaces, totalSupply, createdByTx } = data

  if (upserting) {
    transactionQueries.push(prismaClient.contract.upsert({
      where: { address: contractToSave.address },
      create: contractToSave,
      update: contractToSave
    }))
  } else {
    transactionQueries.push(prismaClient.contract.createMany({ data: contractToSave, skipDuplicates: true }))
  }

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

  return transactionQueries
}

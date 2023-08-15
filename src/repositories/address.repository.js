import {
  rawAddressToEntity,
  rawContractToEntity,
  addressEntityToRaw
} from '../converters/address.converters'
import { generateFindQuery } from './utils'
import { addressRelatedTables } from './includeRelatedTables'
import { txRepository, internalTxRepository } from '.'

async function addCreatedByTxToContractAndConvertToRaw (address) {
  if (address.type === 'contract') {
    const { createdByTx: hash, createdByInternalTx: internalTxId } = address.contract_contract_addressToaddress

    if (hash) {
      const tx = await txRepository.findOne({ hash })
      address.contract_contract_addressToaddress.createdByTx = tx || {}
    } else if (internalTxId) {
      const itx = await internalTxRepository.findOne({ internalTxId })
      address.contract_contract_addressToaddress.createdByTx = itx || {}
    }
  }

  return addressEntityToRaw(address)
}

export function getAddressRepository (prismaClient) {
  return {
    async findOne (query = {}, project = {}) {
      let address = await prismaClient.address.findFirst(generateFindQuery(query, project, addressRelatedTables, project))
      if (address) {
        address = await addCreatedByTxToContractAndConvertToRaw(address)
      }

      return address
    },
    async find (query = {}, project = {}, sort = {}, limit = 0) {
      const addresses = await prismaClient.address.findMany(generateFindQuery(query, project, addressRelatedTables, sort, limit))
      const addressesToReturn = []

      for (const address of addresses) {
        addressesToReturn.push(await addCreatedByTxToContractAndConvertToRaw(address))
      }

      return addressesToReturn
    },
    async countDocuments (query = {}) {
      const count = await prismaClient.address.count({where: query})

      return count
    },
    insertOne (data, { isMiner, number }) {
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

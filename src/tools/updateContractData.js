import { ContractParser } from '@rsksmart/rsk-contract-parser'
import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import nod3 from '../lib/nod3Connect'
import { verificationResultsRepository } from '../repositories'
import BigNumber from 'bignumber.js'
import { getBridgeAddress } from '@rsksmart/rsk-contract-parser/dist/lib/utils'
import { prismaClient } from '../lib/prismaClient'

async function fetchAbiFromDb (contractAddress) {
  try {
    const verification = await verificationResultsRepository.findOne({
      address: contractAddress,
      match: true
    })

    if (!verification || !verification.abi) return null

    return verification.abi
  } catch (error) {
    return Promise.reject(error)
  }
}

function toHex (value) {
  return `0x${BigNumber(value).toString(16)}`
}

async function getContractData (contractAddress, blockNumber) {
  if (!isAddress(contractAddress)) {
    throw new Error('Invalid contract address')
  }

  if (contractAddress === getBridgeAddress()) {
    throw new Error('Bridge contract is not supported')
  }

  if (isNaN(blockNumber)) {
    throw new Error('Invalid block number')
  }

  const contractData = {
    contractAddress: contractAddress.toLowerCase(),
    blockNumber,
    name: null,
    symbol: null,
    decimals: null,
    totalSupply: null,
    contractMethods: [],
    contractInterfaces: []
  }

  const parser = new ContractParser({ nod3 })
  const contractDetails = await parser.getContractDetails(contractAddress)

  // proxies
  if (contractDetails.isProxy) {
    console.log('Contract is a proxy. Checking for verified implementation ABI...')
    const implementationAddress = contractDetails.implementationAddress
    const implementationAbi = await fetchAbiFromDb(implementationAddress)
    if (!implementationAbi) {
      console.log('No verified implementation found. Using default ABI.')
      // set default details
      contractData.contractMethods = contractDetails.methods
      contractData.contractInterfaces = contractDetails.interfaces
    } else {
      console.log('Verified implementation found. Using verified ABI.')
      parser.setAbi(implementationAbi)
      const verifiedContractDetails = await parser.getContractDetails(contractAddress)
      // set verified details
      contractData.contractMethods = verifiedContractDetails.methods
      contractData.contractInterfaces = verifiedContractDetails.interfaces
    }
  } else {
    // non-proxies
    console.log('Contract is not a proxy. Checking for verified ABI...')
    const abi = await fetchAbiFromDb(contractAddress)
    if (!abi) {
      console.log('No verified ABI found. Using default ABI.')
      // set default details
      contractData.contractMethods = contractDetails.methods
      contractData.contractInterfaces = contractDetails.interfaces
    } else {
      console.log('Verified ABI found. Using verified ABI.')
      parser.setAbi(abi)
      const verifiedContractDetails = await parser.getContractDetails(contractAddress)
      // set verified details
      contractData.contractMethods = verifiedContractDetails.methods
      contractData.contractInterfaces = verifiedContractDetails.interfaces
    }
  }

  const contract = await parser.makeContract(contractAddress)
  const tokenData = await parser.getDefaultTokenData(contract, blockNumber)

  // set token data
  contractData.name = tokenData.name
  contractData.symbol = tokenData.symbol
  contractData.decimals = tokenData.decimals
  contractData.totalSupply = toHex(tokenData.totalSupply)

  return contractData
}

async function updateContractData (newContractData) {
  const { contractAddress, blockNumber, name, symbol, decimals, totalSupply, contractMethods, contractInterfaces } = newContractData

  const address = await prismaClient.address.findUnique({
    where: {
      address: contractAddress
    }
  })

  console.log('Address found:')
  console.log(address)

  try {
    // Update address name
    console.log('Updating address name...')
    const addressResult = await prismaClient.address.update({
      where: {
        address: contractAddress
      },
      data: {
        name
      }
    })
    console.log('Address updated:')
    console.log(addressResult)

    // Update contract symbol and decimals
    console.log('Updating contract symbol and decimals...')
    const contractResult = await prismaClient.contract.update({
      where: {
        address: contractAddress
      },
      data: {
        symbol,
        decimals
      }
    })
    console.log('Contract updated:')
    console.log(contractResult)

    // Delete old methods
    console.log('Deleting old methods...')
    const deleteMethodsResult = await prismaClient.contract_method.deleteMany({
      where: {
        contractAddress: contractAddress
      }
    })
    console.log('Old methods deleted:')
    console.log(deleteMethodsResult)

    // Insert new methods
    console.log('Inserting new methods...')
    const methodsToInsert = contractMethods.map(method => ({
      method,
      contractAddress: contractAddress
    }))
    console.log('Methods to insert:')
    console.log(methodsToInsert)

    const insertMethodsResult = await prismaClient.contract_method.createMany({
      data: methodsToInsert
    })
    console.log('New methods inserted:')
    console.log(insertMethodsResult)

    // Delete old interfaces
    console.log('Deleting old interfaces...')
    const deleteInterfacesResult = await prismaClient.contract_interface.deleteMany({
      where: {
        contractAddress: contractAddress
      }
    })
    console.log('Old interfaces deleted:')
    console.log(deleteInterfacesResult)

    // Insert new interfaces
    console.log('Inserting new interfaces...')
    const interfacesToInsert = contractInterfaces.map(interf => ({
      interface: interf,
      contractAddress: contractAddress
    }))
    console.log('Interfaces to insert:')
    console.log(interfacesToInsert)

    const insertInterfacesResult = await prismaClient.contract_interface.createMany({
      data: interfacesToInsert
    })
    console.log('New interfaces inserted:')
    console.log(insertInterfacesResult)

    // Delete and insert total supply
    console.log('Deleting old total supply...')
    const deleteTotalSupplyResult = await prismaClient.total_supply.deleteMany({
      where: {
        contractAddress: contractAddress
      }
    })
    console.log('Old total supply deleted:')
    console.log(deleteTotalSupplyResult)

    console.log('Inserting new total supply...')
    const insertTotalSupplyResult = await prismaClient.total_supply.create({
      data: {
        contractAddress: contractAddress,
        blockNumber: blockNumber,
        totalSupply: totalSupply
      }
    })
    console.log('New total supply inserted:')
    console.log(insertTotalSupplyResult)

    console.log('All operations completed successfully!')
  } catch (error) {
    console.error('Error during update:')
    console.error(error)
  }
}

async function main () {
  let contractAddress = process.argv[2]
  let blockNumber = process.argv[3]

  if (!isAddress(contractAddress)) {
    throw new Error('Invalid contract address')
  }

  if (contractAddress === getBridgeAddress()) {
    throw new Error('Bridge contract is not supported')
  }

  if (isNaN(parseInt(blockNumber))) {
    throw new Error('Invalid block number')
  }

  contractAddress = contractAddress.toLowerCase()
  blockNumber = parseInt(blockNumber)

  const contractData = await getContractData(contractAddress, blockNumber)
  await updateContractData(contractData)
}

main().catch(console.error)

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
  try {
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

      if (!isAddress(implementationAddress)) throw new Error('Invalid implementation address')

      const implementationAbi = await fetchAbiFromDb(implementationAddress)
      if (!implementationAbi) {
        console.log('No verified implementation found. Using default ABI for data fetch...')
        // set default details
        contractData.contractMethods = contractDetails.methods
        contractData.contractInterfaces = contractDetails.interfaces
      } else {
        console.log('Verified implementation found. Using verified ABI for data fetch...')
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
        console.log('No verified ABI found. Using default ABI for data fetch...')
        // set default details
        contractData.contractMethods = contractDetails.methods
        contractData.contractInterfaces = contractDetails.interfaces
      } else {
        console.log('Verified ABI found. Using verified ABI for data fetch...')
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
  } catch (error) {
    console.error('Error during contract data fetch')
    console.error(error)
    return null
  }
}

async function updateContractData (newContractData) {
  try {
    const {
      contractAddress,
      blockNumber,
      name,
      symbol,
      decimals,
      totalSupply,
      contractMethods,
      contractInterfaces
    } = newContractData

    const address = await prismaClient.address.findFirst({
      where: { address: contractAddress }
    })

    if (!address) throw new Error('Address not found in database')

    const transactionQueries = [
      // Update address name
      prismaClient.address.update({
        where: { address: contractAddress },
        data: { name }
      }),
      // Update contract symbol and decimals
      prismaClient.contract.update({
        where: { address: contractAddress },
        data: { symbol, decimals }
      }),
      // Delete old methods
      prismaClient.contract_method.deleteMany({
        where: { contractAddress }
      }),
      // Insert new methods
      prismaClient.contract_method.createMany({
        data: contractMethods.map(method => ({ method, contractAddress }))
      }),
      // Delete old interfaces
      prismaClient.contract_interface.deleteMany({
        where: { contractAddress }
      }),
      // Insert new interfaces
      prismaClient.contract_interface.createMany({
        data: contractInterfaces.map(interf => ({ interface: interf, contractAddress }))
      }),
      // Delete old total supply
      prismaClient.total_supply.deleteMany({
        where: { contractAddress }
      }),
      // Insert new total supply
      prismaClient.total_supply.create({
        data: { contractAddress, blockNumber, totalSupply }
      })
    ]

    return prismaClient.$transaction(transactionQueries)
  } catch (error) {
    console.error('Error during contract data update:')
    console.error(error)
  }
}

function printUsageAndExit () {
  console.error('Usage: node updateContractData.js <contractAddress> <blockNumber>')
  process.exit(1)
}

async function main () {
  let contractAddress = process.argv[2]
  let blockNumber = process.argv[3]

  if (!isAddress(contractAddress)) {
    console.error('Invalid contract address')
    printUsageAndExit()
  }

  if (contractAddress === getBridgeAddress()) {
    console.error('Bridge contract is not supported')
    printUsageAndExit()
  }

  if (isNaN(parseInt(blockNumber))) {
    console.error('Invalid block number')
    printUsageAndExit()
  }

  contractAddress = contractAddress.toLowerCase()
  blockNumber = parseInt(blockNumber)

  console.log(`Fetching details for contact ${contractAddress} at block ${blockNumber}...`)

  const contractData = await getContractData(contractAddress, blockNumber)

  if (!contractData) throw new Error('Failed to fetch contract data')

  console.log(`Contract data fetched successfully!`)
  console.dir(contractData, { depth: null })
  console.log('Updating contract data...')

  const result = await updateContractData(contractData)
  if (!result) throw new Error('Failed to update contract data')

  console.log('Contract data updated successfully!')
  process.exit(0)
}

main()

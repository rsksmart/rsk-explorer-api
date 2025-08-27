import { ContractParser } from '@rsksmart/rsk-contract-parser'
import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import nod3 from '../lib/nod3Connect'
import { prismaClient } from '../lib/prismaClient'
import BigNumber from 'bignumber.js'
import { verificationResultsRepository } from '../repositories'
import { tokensInterfaces } from '../lib/types'
import { NativeContracts } from '../lib/NativeContracts'

export function toHex (value) {
  return `0x${BigNumber(value).toString(16)}`
}

export async function fetchAbiFromDb (contractAddress) {
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

export async function getLatestBlockNumber () {
  try {
    const latestBlock = await nod3.eth.getBlock('latest')
    return latestBlock.number
  } catch (error) {
    console.error('Error getting latest block number')
    throw error
  }
}

export async function fetchPaginatedContracts (pageSize, cursor = null) {
  try {
    const MIN_PAGE_SIZE = 1
    const MAX_PAGE_SIZE = 100
    const take = Math.min(Math.max(pageSize, MIN_PAGE_SIZE), MAX_PAGE_SIZE) + 1

    const query = {}
    if (cursor) {
      query.address = {
        lt: cursor
      }
    }

    const contracts = await prismaClient.contract.findMany({
      where: query,
      select: { address: true },
      orderBy: { address: 'desc' },
      take
    })

    const hasMore = contracts.length === take
    const nextCursor = hasMore ? contracts[contracts.length - 1].address : null

    return {
      next: nextCursor,
      pageSize: take - 1,
      minPageSize: MIN_PAGE_SIZE,
      maxPageSize: MAX_PAGE_SIZE,
      contracts: contracts.slice(0, take - 1)
    }
  } catch (error) {
    console.error('Error fetching paginated contracts')
    throw error
  }
}

export async function getContractData (contractAddress, blockNumber) {
  const startTime = Date.now()

  try {
    if (!isAddress(contractAddress)) {
      throw new Error('Invalid contract address')
    }

    if (isNaN(blockNumber)) {
      throw new Error('Invalid block number')
    }

    const contractData = {
      contractAddress: contractAddress.toLowerCase(),
      blockNumber,
      isToken: false,
      isProxy: false,
      proxyType: null,
      implementationAddress: null,
      beaconAddress: null,
      isNative: false,
      name: null,
      symbol: null,
      decimals: null,
      totalSupply: null,
      contractMethods: [],
      contractInterfaces: [],
      fetchTimeMs: null,
      updateTimeMs: null
    }

    // Native contracts
    if (NativeContracts.isNativeContract(contractAddress)) {
      contractData.isNative = true
      contractData.name = NativeContracts.getNativeContractName(contractAddress)
      contractData.contractMethods = NativeContracts.getNativeContractMethods(contractAddress)
      contractData.contractInterfaces = NativeContracts.getNativeContractInterfaces(contractAddress)

      contractData.fetchTimeMs = Date.now() - startTime
      return contractData
    }

    const parser = new ContractParser({ nod3 })
    const contractDetails = await parser.getContractDetails(contractAddress, blockNumber)

    // proxies
    if (contractDetails.isProxy) {
      contractData.isProxy = true
      contractData.proxyType = contractDetails.proxyType
      contractData.implementationAddress = contractDetails.implementationAddress
      contractData.beaconAddress = contractDetails.beaconAddress

      const implementationAddress = contractData.implementationAddress

      if (!isAddress(implementationAddress)) throw new Error('Invalid implementation address')

      const implementationAbi = await fetchAbiFromDb(implementationAddress)
      if (!implementationAbi) {
        // set default details
        contractData.contractMethods = contractDetails.methods
        contractData.contractInterfaces = contractDetails.interfaces
      } else {
        parser.setAbi(implementationAbi)
        const verifiedContractDetails = await parser.getContractDetails(contractAddress, blockNumber)
        // set verified details
        contractData.contractMethods = verifiedContractDetails.methods
        contractData.contractInterfaces = verifiedContractDetails.interfaces
      }
    } else {
      // non-proxies
      const abi = await fetchAbiFromDb(contractAddress)
      if (!abi) {
        // set default details
        contractData.contractMethods = contractDetails.methods
        contractData.contractInterfaces = contractDetails.interfaces
      } else {
        parser.setAbi(abi)
        const verifiedContractDetails = await parser.getContractDetails(contractAddress, blockNumber)
        // set verified details
        contractData.contractMethods = verifiedContractDetails.methods
        contractData.contractInterfaces = verifiedContractDetails.interfaces
      }
    }

    // set token data
    const isToken = contractData.contractInterfaces.some(interf => tokensInterfaces.includes(interf))

    if (isToken) {
      const contract = await parser.makeContract(contractAddress)
      const tokenData = await parser.getDefaultTokenData(contract, blockNumber)
      contractData.isToken = true
      contractData.name = tokenData.name
      contractData.symbol = tokenData.symbol
      contractData.decimals = tokenData.decimals
      contractData.totalSupply = toHex(tokenData.totalSupply || 0)
    }

    contractData.fetchTimeMs = Date.now() - startTime
    return contractData
  } catch (error) {
    console.error(`[getContractData] Error fetching contract data for ${contractAddress} at block ${blockNumber}`)
    return Promise.reject(error)
  }
}

export async function updateContractData (newContractData) {
  const startTime = Date.now()

  try {
    const {
      contractAddress,
      blockNumber,
      name,
      symbol,
      decimals,
      totalSupply,
      contractMethods,
      contractInterfaces,
      isNative,
      isToken
    } = newContractData

    const address = await prismaClient.address.findFirst({
      where: { address: contractAddress }
    })

    if (!address) throw new Error(`Cannot update contract ${contractAddress} data. Address not found in database.`)

    // Contract methods and interfaces
    const contractQueries = [
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
      })
    ]

    // Native contracts
    if (isNative) {
      const nativeContractQueries = [
        // Update contract name
        prismaClient.address.update({
          where: { address: contractAddress },
          data: { name }
        })
      ]

      contractQueries.push(...nativeContractQueries)
    }

    // Token contracts
    if (isToken) {
      const tokenContractQueries = [
        // Update contract name
        prismaClient.address.update({
          where: { address: contractAddress },
          data: { name }
        }),
        // Update contract symbol and decimals
        prismaClient.contract.update({
          where: { address: contractAddress },
          data: { symbol, decimals }
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

      contractQueries.push(...tokenContractQueries)
    }

    const result = await prismaClient.$transaction(contractQueries)

    // Update the contractData with updateTime
    newContractData.updateTimeMs = Date.now() - startTime

    return result
  } catch (error) {
    console.error(`[updateContractData] Error updating contract data for ${newContractData.contractAddress} at block ${newContractData.blockNumber}`)
    return Promise.reject(error)
  }
}

export function parseArguments (validOptions) {
  const args = process.argv.slice(2)
  const options = {}

  // Initialize all valid options with their default values using config.name
  for (const [, config] of Object.entries(validOptions)) {
    options[config.name] = config.default
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (!validOptions[arg]) {
      throw new Error(`Unknown option '${arg}'`)
    }

    const config = validOptions[arg]

    // Boolean flags: no value required
    if (config.type === 'boolean') {
      options[config.name] = true
      continue
    }

    if (i + 1 >= args.length) {
      throw new Error(`${arg} requires a value`)
    }

    const value = args[i + 1]

    // Validate and parse the value
    if (config.type === 'number') {
      const parsedValue = parseInt(value)
      if (isNaN(parsedValue) || (config.min !== undefined && parsedValue < config.min) || (config.max !== undefined && parsedValue > config.max)) {
        const minMsg = config.min !== undefined ? ` >= ${config.min}` : ''
        const maxMsg = config.max !== undefined ? ` <= ${config.max}` : ''
        throw new Error(`${arg} value must be a number${minMsg}${maxMsg}`)
      }
      options[config.name] = parsedValue
    } else if (config.type === 'string') {
      if (config.required && !value) {
        throw new Error(`${arg} requires a non-empty value`)
      }
      options[config.name] = value
    }

    i++ // Skip the next argument since we consumed it
  }

  // Check required options
  for (const [optionName, config] of Object.entries(validOptions)) {
    if (config.required && (options[config.name] === null || options[config.name] === undefined)) {
      throw new Error(`${optionName} is required`)
    }
  }

  return options
}

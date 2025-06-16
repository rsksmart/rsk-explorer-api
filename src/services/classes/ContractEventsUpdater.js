import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import { ContractParser } from '@rsksmart/rsk-contract-parser'
import { configRepository, eventRepository, verificationResultsRepository } from '../../repositories'
import { prismaClient } from '../../lib/prismaClient'
import nod3 from '../../lib/nod3Connect'
import { EXPLORER_INITIAL_CONFIG_ID } from '../../lib/defaultConfig'

export class ContractEventsUpdater {
  constructor ({ log = console }) {
    this.log = log
  }

  validateContractAddress (contractAddress) {
    if (!contractAddress || !isAddress(contractAddress)) {
      throw new Error('Invalid contract address')
    }
  }

  validateContractDetails (contractDetails) {
    if (!contractDetails) throw new Error('Invalid contractDetails provided')
    if (!contractDetails.address) throw new Error('Invalid contractDetails provided: Missing contract address')
    if (contractDetails.isProxy && !isAddress(contractDetails.implementationAddress)) {
      throw new Error(`Invalid implementation address provided for proxy contract ${contractDetails.address}`)
    }
  }

  validatePageSize (pageSize) {
    if (isNaN(pageSize)) throw new Error('Invalid pageSize value provided. Must be a number')
  }

  async updateContractEvents (contractAddress, pageSize = 100) {
    const result = {
      contractDetails: null,
      verifiedAbi: false,
      updatedEvents: {
        amount: 0,
        events: []
      }
    }

    this.validateContractAddress(contractAddress)
    this.validatePageSize(pageSize)

    // Normalize contract address
    contractAddress = contractAddress.toLowerCase()

    const { parser, contractDetails, verifiedAbi } = await this.getContractParser(contractAddress)
    result.contractDetails = contractDetails
    result.verifiedAbi = verifiedAbi

    const { events, next } = await this.fetchPaginatedEvents({
      address: contractAddress,
      event: null
    }, pageSize)

    // No events
    if (events.length === 0) return result

    // One page
    if (!next) {
      console.log('One page')
      result.updatedEvents.events = await this.processEvents(parser, events)
      result.updatedEvents.amount = result.updatedEvents.events.length
      return result
    }

    let cursor = next

    // Multiple pages
    while (cursor) {
      console.log('Multiple pages')
      const { events, next } = await this.fetchPaginatedEvents({
        address: contractAddress,
        eventId: {
          lte: cursor
        },
        event: null
      }, pageSize)

      const processedEventsResult = await this.processEvents(parser, events)
      result.updatedEvents.events.push(...processedEventsResult)
      result.updatedEvents.amount += processedEventsResult.length

      cursor = next
    }

    return result
  }

  async fetchPaginatedEvents (query, pageSize) {
    if (!query) throw new Error('Invalid query provided')

    const select = undefined
    const sort = { eventId: 'desc' }
    const options = {}
    const MIN_PAGE_SIZE = 1
    const MAX_PAGE_SIZE = 1000
    const take = Math.min(Math.max(pageSize, MIN_PAGE_SIZE), MAX_PAGE_SIZE) + 1
    const events = await eventRepository.find(query, select, sort, take, options)
    const hasMore = events.length === take
    const cursor = hasMore ? events[events.length - 1].eventId : null

    return {
      next: hasMore ? cursor : null,
      pageSize: take - 1,
      minPageSize: MIN_PAGE_SIZE,
      maxPageSize: MAX_PAGE_SIZE,
      events: events.slice(0, take - 1)
    }
  }

  async processEvents (parser, events = []) {
    if (!parser || !(parser instanceof ContractParser)) throw new Error('Invalid contract parser provided')

    const parsedEvents = parser.parseTxLogs(events)
    const decodedEvents = parsedEvents.filter(event => event.event !== null)
    const upsertQueries = decodedEvents.map(event => eventRepository.upsertOne(event))
    const transactionResult = await prismaClient.$transaction(upsertQueries)

    return transactionResult.map(upsertEvent => {
      return {
        eventId: upsertEvent.eventId,
        decoded: upsertEvent.event !== null,
        name: upsertEvent.event,
        blockNumber: upsertEvent.blockNumber,
        transactionHash: upsertEvent.transactionHash,
        timestamp: new Date(Number(upsertEvent.timestamp) * 1000).toISOString()
      }
    })
  }

  async getContractParser (contractAddress) {
    this.validateContractAddress(contractAddress)

    const initConfig = await configRepository[EXPLORER_INITIAL_CONFIG_ID].get()
    const parser = new ContractParser({ nod3, initConfig })
    let contractDetails = await parser.getContractDetails(contractAddress)
    const verifiedAbi = await this.getContractABI(contractAddress, contractDetails)

    if (verifiedAbi) {
      parser.setAbi(verifiedAbi)
      // Get full contract details
      contractDetails = await parser.getContractDetails(contractAddress)
    }

    return {
      parser,
      contractDetails,
      verifiedAbi: !!verifiedAbi
    }
  }

  async getContractABI (contractAddress, contractDetails) {
    this.validateContractAddress(contractAddress)
    this.validateContractDetails(contractDetails)

    if (contractDetails.isProxy) {
      return this.fetchAbiFromDb(contractDetails.implementationAddress)
    }

    return this.fetchAbiFromDb(contractAddress)
  }

  async fetchAbiFromDb (contractAddress) {
    if (!isAddress(contractAddress)) throw new Error('Invalid contractAddress provided. Unable to fetch ABI')

    const verification = await verificationResultsRepository.findOne({
      address: contractAddress,
      match: true
    })

    if (!verification || !verification.abi) return null

    return verification.abi
  }
}

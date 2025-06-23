import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import { ContractParser } from '@rsksmart/rsk-contract-parser'
import { configRepository, eventRepository, verificationResultsRepository } from '../../repositories'
import { prismaClient } from '../../lib/prismaClient'
import nod3 from '../../lib/nod3Connect'
import { EXPLORER_INITIAL_CONFIG_ID } from '../../lib/defaultConfig'
import { getBridgeAddress } from '@rsksmart/rsk-contract-parser/dist/lib/utils'

export default class ContractEventsUpdater {
  constructor ({ log = console } = {}) {
    this.log = log
    this.initConfig = null
  }

  async getInitConfig () {
    if (!this.initConfig) {
      this.initConfig = await configRepository[EXPLORER_INITIAL_CONFIG_ID].get()
    }

    return this.initConfig
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

  async updateAllContractsEvents (pageSize, sinceBlockNumber = 0) {
    try {
      const contracts = await prismaClient.contract.findMany({ select: { address: true } })
      const contractAddresses = contracts.map(contract => contract.address)
      const results = {}

      for (const contractAddress of contractAddresses) {
        try {
          const result = await this.updateContractEvents(contractAddress, pageSize, sinceBlockNumber)
          results[contractAddress] = result
        } catch (error) {
          continue
        }
      }

      return results
    } catch (error) {
      this.log.error(`Error while updating all contracts events: ${error.message}`)
      throw error
    }
  }

  async updateContractEvents (contractAddress, pageSize, sinceBlockNumber = 0) {
    try {
      const result = {
        contractDetails: null,
        verifiedAbi: false,
        // TODO: update names according to which events were updated and which not
        updatedEvents: {
          amount: 0,
          events: []
        }
      }

      this.validateContractAddress(contractAddress)
      this.validatePageSize(pageSize)

      // Normalize contract address
      contractAddress = contractAddress.toLowerCase()
      const isBridge = contractAddress === getBridgeAddress()

      const { parser, contractDetails, verifiedAbi } = await this.getContractParser(contractAddress)
      result.contractDetails = contractDetails
      result.verifiedAbi = isBridge ? true : verifiedAbi

      const query = {
        address: contractAddress,
        event: null
      }

      if (!isNaN(sinceBlockNumber)) {
        query.blockNumber = {
          gte: sinceBlockNumber
        }
      }

      this.log.info(`Updating events for contract ${contractAddress}${sinceBlockNumber ? ` since block number: ${sinceBlockNumber}...` : '...'}`)

      const { events, next } = await this.fetchPaginatedEvents(query, pageSize)

      // No events
      if (events.length === 0) return result

      // First page
      const processedEventsResult = await this.processEvents(parser, events, isBridge)
      result.updatedEvents.events.push(...processedEventsResult)
      result.updatedEvents.amount = result.updatedEvents.events.length

      if (!next) return result

      // Next pages
      let cursor = next
      while (cursor) {
        const { events, next } = await this.fetchPaginatedEvents({
          address: contractAddress,
          eventId: {
            lte: cursor
          },
          event: null
        }, pageSize)

        const processedEventsResult = await this.processEvents(parser, events, isBridge)
        result.updatedEvents.events.push(...processedEventsResult)
        result.updatedEvents.amount = result.updatedEvents.events.length

        cursor = next
      }

      const updatedEventsMsg = result.updatedEvents.amount > 0
        ? `Updated ${result.updatedEvents.amount} events for contract ${contractAddress}`
        : `No events could be updated for contract ${contractAddress}`

      const verifiedAbiMsg = result.verifiedAbi
        ? `Verified ABI: ${result.verifiedAbi}`
        : 'No verified ABI found for contract. Note that a verified ABI is required to decode all events correctly.'

      this.log.info(updatedEventsMsg)
      this.log.info(verifiedAbiMsg)
      return result
    } catch (error) {
      const msg = isAddress(contractAddress)
        ? `Error while updating events for contract ${contractAddress}: ${error.message}`
        : `Error while updating events: ${error.message}`
      this.log.error(msg)
      throw error
    }
  }

  async fetchPaginatedEvents (query, pageSize) {
    try {
      if (!query) throw new Error('Invalid query provided')
      this.validatePageSize(pageSize)

      const select = undefined
      const sort = { eventId: 'desc' }
      const options = {}
      const MIN_PAGE_SIZE = 2
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
    } catch (error) {
      const msg = query && isAddress(query.address)
        ? `Error fetching paginated events for contract ${query.address}: ${error.message}`
        : `Error fetching paginated events: ${error.message}`
      this.log.error(msg)
      return Promise.reject(error)
    }
  }

  validateEvent (event) {
    if (!event) throw new Error('Invalid event provided')
    if (!event.eventId) throw new Error('Invalid event provided: Missing eventId')
    if (!isAddress(event.address)) throw new Error('Invalid event provided: Missing address')
    if (isNaN(event.blockNumber)) throw new Error('Invalid event provided: Invalid blockNumber')
    if (!event.transactionHash) throw new Error('Invalid event provided: Missing transactionHash')
    if (isNaN(event.logIndex)) throw new Error('Invalid event provided: Invalid logIndex')
  }

  // Note: This function assumes all events were emitted by the same contract address
  async processEvents (parser, events = [], isBridge = false) {
    try {
      if (!parser || !(parser instanceof ContractParser)) throw new Error('Invalid contract parser provided')

      const result = []

      for (const event of events) {
        const eventDetails = {
          eventId: null,
          name: null,
          blockNumber: null,
          transactionHash: null,
          logIndex: null,
          timestamp: null,
          decoded: false,
          updated: false,
          error: false,
          errorMessage: null,
          eventDebugData: null
        }

        const debugData = {
          event,
          parsedEvent: null
        }

        result.push(eventDetails)

        try {
          this.validateEvent(event)

          // Bridge: Get custom parser according to event block height since bridge ABI changes at certain block heights
          if (isBridge) {
            const { parser: bridgeParser } = await this.getBridgeContractParser(event.blockNumber)
            parser = bridgeParser
          }

          eventDetails.eventId = event.eventId
          eventDetails.blockNumber = event.blockNumber
          eventDetails.transactionHash = event.transactionHash
          eventDetails.logIndex = event.logIndex
          eventDetails.timestamp = event.timestamp

          // Parse event
          const [parsedEvent] = parser.parseTxLogs([event])
          debugData.parsedEvent = parsedEvent

          // Undecodeable events
          if (parsedEvent.event === null) throw new Error('Unable to decode event')

          eventDetails.decoded = true
          eventDetails.name = parsedEvent.event

          // Update event
          const updatedEvent = await eventRepository.upsertOne(parsedEvent)
          eventDetails.updated = !!updatedEvent

          this.log.info(`Updated event ${event.eventId} for contract ${event.address} at block ${event.blockNumber}, tx ${event.transactionHash}, logIndex: ${event.logIndex}`)
        } catch (error) {
          this.log.error(`Error processing event ${event.eventId} for contract ${event.address} at block ${event.blockNumber}, tx ${event.transactionHash}, logIndex: ${event.logIndex}: ${error.message}. Skipping...`)
          eventDetails.error = true
          eventDetails.errorMessage = error.message
          eventDetails.eventDebugData = debugData
        }
      }

      return result
    } catch (error) {
      this.log.error(`Error processing events: ${error.message}`)
      return []
    }
  }

  async getContractParser (contractAddress) {
    try {
      this.validateContractAddress(contractAddress)

      const initConfig = await this.getInitConfig()
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
    } catch (error) {
      const msg = isAddress(contractAddress)
        ? `Error getting contract parser for contract ${contractAddress}: ${error.message}`
        : `Error getting contract parser: ${error.message}`
      this.log.error(msg)
      return Promise.reject(error)
    }
  }

  async getBridgeContractParser (blockNumber) {
    if (!blockNumber || (isNaN(blockNumber) && blockNumber !== 'latest')) throw new Error('Invalid blockNumber provided')

    const bridgeAddress = getBridgeAddress()
    const initConfig = await this.getInitConfig()
    const parser = new ContractParser({ nod3, initConfig, txBlockNumber: blockNumber })
    const contractDetails = await parser.getContractDetails(bridgeAddress)

    return {
      parser,
      contractDetails,
      verifiedAbi: true
    }
  }

  async getContractABI (contractAddress, contractDetails) {
    try {
      this.validateContractAddress(contractAddress)
      this.validateContractDetails(contractDetails)

      if (contractDetails.isProxy) {
        return this.fetchAbiFromDb(contractDetails.implementationAddress)
      }

      return this.fetchAbiFromDb(contractAddress)
    } catch (error) {
      const msg = isAddress(contractAddress)
        ? `Error getting contract ABI for contract ${contractAddress}: ${error.message}`
        : `Error getting contract ABI: ${error.message}`
      this.log.error(msg)
      return Promise.reject(error)
    }
  }

  async fetchAbiFromDb (contractAddress) {
    try {
      this.validateContractAddress(contractAddress)

      const verification = await verificationResultsRepository.findOne({
        address: contractAddress,
        match: true
      })

      if (!verification || !verification.abi) return null

      return verification.abi
    } catch (error) {
      const msg = isAddress(contractAddress)
        ? `Error fetching ABI from DB for contract ${contractAddress}: ${error.message}`
        : `Error fetching ABI from DB: ${error.message}`
      this.log.error(msg)
      return Promise.reject(error)
    }
  }
}

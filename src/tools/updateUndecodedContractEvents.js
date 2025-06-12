import { ContractParser } from '@rsksmart/rsk-contract-parser'
import nod3 from '../lib/nod3Connect'
import { configRepository, eventRepository, verificationResultsRepository } from '../repositories'
import { EXPLORER_INITIAL_CONFIG_ID } from '../lib/defaultConfig'
import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'

// Sometimes, contract events are not decoded correctly. This could happen due to several reasons
// The most probable ones are:
// 1. Contract is not verified (contracts parser logic can decode most common events with its default abi, but custom events / events not supported won't be properly decoded)
// 2. Contract is using an unsupported proxy pattern (unable to detect proper implementation data)
// This scripts updates the database events by decoding them again when possible.

async function main () {
  // validate arguments
  const targetAddress = process.argv[2]

  if (!targetAddress || !isAddress(targetAddress)) {
    console.log('Please provide a valid target address')
    console.log('Usage: node dist/tools/decodeContractEvents.js targetAddress')
    process.exit(1)
  }

  // get undecoded events
  const undecodedEvents = await eventRepository.find({
    address: targetAddress,
    event: null
  },
  undefined,
  undefined,
  undefined,
  {}
  )

  console.dir({
    result: {
      count: undecodedEvents.length,
      undecodedEvents
    }
  }, { depth: null })

  if (undecodedEvents.length === 0) {
    console.log('No undecoded events found')
    process.exit(0)
  }

  // get contract details
  const initConfig = await configRepository[EXPLORER_INITIAL_CONFIG_ID].get()
  console.dir({ parserInitConfig: initConfig }, { depth: null })
  const parser = new ContractParser({ nod3, initConfig })
  const contractDetails = await parser.getContractDetails(targetAddress)

  console.dir({ contractDetails }, { depth: null })

  // fetch abi
  let abi = null
  if (contractDetails.isProxy) {
    console.log('Contract is a proxy. Fetching implementation ABI...')

    if (!contractDetails.implementationAddress) {
      console.log(`No implementation address provided. Unable to decode events from contract ${targetAddress}`)
      process.exit(1)
    }

    const verification = await verificationResultsRepository.findOne({
      address: contractDetails.implementationAddress,
      match: true
    })

    console.log('Implementation ABI found')
    if (verification) abi = verification.abi
  } else {
    console.log('Contract is not a proxy. Fetching contract ABI...')
    const verification = await verificationResultsRepository.findOne({
      address: targetAddress,
      match: true
    })

    console.log('Contract ABI found')
    if (verification) abi = verification.abi
  }

  console.dir({ abiLength: abi.length, abi }, { depth: null })

  if (!abi) {
    console.log(`No ABI found for contract ${targetAddress}`)
    process.exit(1)
  }

  // attempt to decode events
  parser.setAbi(abi)

  const decodedEvents = parser.parseTxLogs(undecodedEvents)

  console.dir({
    decodingResult: {
      count: decodedEvents.length,
      decodedEvents
    }
  }, { depth: null })

  // remove old events
  const deletionResult = await eventRepository.deleteMany({
    eventId: {
      in: decodedEvents.map(event => event.eventId)
    }
  })

  console.dir({ deletionResult }, { depth: null })

  // store decoded events
  for (const decodedEvent of decodedEvents) {
    const storedEvent = await eventRepository.insertOne(decodedEvent)
    console.dir({ storedEvent }, { depth: null })
  }

  console.log('Done')
}

main()

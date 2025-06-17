import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import { ContractEventsUpdater } from '../services/classes/ContractEventsUpdater'

// Sometimes, contract events are not decoded correctly. This could happen due to several reasons
// The most probable ones are:
// 1. Contract is not verified (contracts parser logic can decode most common events with its default abi, but custom events / events not supported won't be properly decoded)
// 2. Contract is using an unsupported proxy pattern (unable to detect proper implementation data)
// This scripts updates the database events by decoding them again when possible.

const toolName = process.argv[1].split('/').pop()

function printUsageAndExit () {
  console.log(`Usage: node dist/tools/${toolName}.js targetAddress(address: required) pageSize(number: required) sinceBlockNumber(number: optional)`)
  process.exit(1)
}

async function main () {
  // validate arguments
  let targetAddress = process.argv[2]

  if (!targetAddress || !isAddress(targetAddress)) {
    console.log('Invalid target address provided. Must be a valid address')
    printUsageAndExit()
  }

  // Normalize address
  targetAddress = targetAddress.toLowerCase()

  const pageSize = process.argv[3]

  if (!pageSize) {
    console.log('pageSize is required')
    printUsageAndExit()
  }

  const parsedPageSize = parseInt(pageSize)

  if (isNaN(parsedPageSize) || parsedPageSize <= 0) {
    console.log('Invalid pageSize provided. Must be a positive number')
    printUsageAndExit()
  }

  const sinceBlockNumber = process.argv[4]
  let parsedSinceBlockNumber

  if (sinceBlockNumber) {
    parsedSinceBlockNumber = parseInt(sinceBlockNumber)

    if (isNaN(parsedSinceBlockNumber) || parsedSinceBlockNumber < 0) {
      console.log('Invalid sinceBlockNumber provided. Must be a positive number')
      printUsageAndExit()
    }
  }

  try {
    console.log(`${toolName}`)
    console.log(`Target address: ${targetAddress}`)
    console.log(`Page size: ${parsedPageSize}. Note that this value could be overridden according to event updater limits.`)
    if (parsedSinceBlockNumber) {
      console.log(`Since block number: #${parsedSinceBlockNumber}`)
    }

    const contractEventsUpdater = new ContractEventsUpdater()
    await contractEventsUpdater.updateContractEvents(targetAddress, parsedPageSize, parsedSinceBlockNumber)
  } catch (error) {
    console.log(`[Tool ${toolName}]: Error updating contract events`)
    console.error(error)
    process.exit(1)
  }
}

main()

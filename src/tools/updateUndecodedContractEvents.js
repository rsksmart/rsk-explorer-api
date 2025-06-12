import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import { updateUndecodedContractEvents } from '../lib/utils'

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

  try {
    await updateUndecodedContractEvents({ contractAddress: targetAddress })
  } catch (error) {
    const toolName = process.argv[1].split('/').pop()
    console.log(`[Tool ${toolName}]: Error updating contract events`)
    console.error(error)
    process.exit(1)
  }
}

main()

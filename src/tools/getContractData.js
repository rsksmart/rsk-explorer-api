import fs from 'fs'
import path from 'path'
import { getLatestBlockNumber, getContractData, parseArguments } from './utils.js'

const toolName = process.argv[1].split('/').pop()

function printUsageAndExit () {
  console.log(`Usage: npx babel-node src/tools/${toolName} [options]`)
  console.log(`Options:`)
  console.log(`  --address <string>   The contract address to fetch data for (required)`)
  console.log(`  --block <number>     Block number to fetch data at (default: latest block)`)
  console.log(`Examples:`)
  console.log(`  npx babel-node src/tools/${toolName} --address 0x123...`)
  console.log(`  npx babel-node src/tools/${toolName} --address 0x123... --block 5000000`)
  process.exit(1)
}

async function main () {
  const validOptions = {
    '--address': { name: 'address', type: 'string', default: null, required: true },
    '--block': { name: 'blockNumber', type: 'number', default: null, min: 0 }
  }

  let options
  try {
    options = parseArguments(validOptions)
  } catch (error) {
    console.log(`Error: ${error.message}`)
    printUsageAndExit()
  }

  try {
    // Normalize address
    const normalizedAddress = options.address.toLowerCase()

    console.log(`${toolName}`)
    console.log(`Fetching data for contract: ${normalizedAddress}`)

    // Get block number if not provided
    let targetBlockNumber = options.blockNumber
    if (!targetBlockNumber) {
      targetBlockNumber = await getLatestBlockNumber()
      console.log(`Using latest block: ${targetBlockNumber}`)
    } else {
      console.log(`Using specified block: ${targetBlockNumber}`)
    }

    const contractData = await getContractData(normalizedAddress, targetBlockNumber)

    const result = {
      blockNumber: targetBlockNumber,
      contractData
    }

    console.log('\n=== RESULT ===')
    console.dir(result, { depth: null })
    console.log(`\nFetch time: ${contractData.fetchTimeMs}ms`)

    // Save result to file
    const fileName = `contract-data-${normalizedAddress}-${Date.now()}.json`
    const resultFilePath = path.join(__dirname, fileName)
    fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2))
    console.log(`\nResults saved to: ${fileName}`)

    process.exit(0)
  } catch (error) {
    console.log(`[${toolName}]: Error fetching contract data`)
    console.error(error)
    process.exit(1)
  }
}

main()

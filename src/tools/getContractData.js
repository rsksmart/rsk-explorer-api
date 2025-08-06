import fs from 'fs'
import path from 'path'
import { getLatestBlockNumber, getContractData } from './utils.js'

const toolName = process.argv[1].split('/').pop()

function printUsageAndExit () {
  console.log(`Usage: node dist/tools/${toolName}.js contractAddress [blockNumber(number: optional)]`)
  console.log(`  contractAddress: The contract address to fetch data for`)
  console.log(`  blockNumber: Block number to fetch data at (default: latest block)`)
  process.exit(1)
}

async function main () {
  const contractAddress = process.argv[2]
  const blockNumber = process.argv[3]

  if (!contractAddress) {
    console.log('Contract address is required')
    printUsageAndExit()
  }

  const parsedBlockNumber = blockNumber ? parseInt(blockNumber) : null

  if (blockNumber && (isNaN(parsedBlockNumber) || parsedBlockNumber < 0)) {
    console.log('Invalid blockNumber provided. Must be a non-negative number (or leave it blank to use latest block)')
    printUsageAndExit()
  }

  try {
    // Normalize address
    const normalizedAddress = contractAddress.toLowerCase()

    console.log(`${toolName}`)
    console.log(`Fetching data for contract: ${normalizedAddress}`)

    // Get block number if not provided
    let targetBlockNumber = parsedBlockNumber
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

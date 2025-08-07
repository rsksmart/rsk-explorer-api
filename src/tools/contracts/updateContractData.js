import fs from 'fs'
import path from 'path'
import { getLatestBlockNumber, getContractData, updateContractData, parseArguments } from '../utils.js'

const toolName = process.argv[1].split('/').pop()

function printUsageAndExit () {
  console.log(`Usage: npx babel-node src/tools/contracts/${toolName} [options]`)
  console.log(`Options:`)
  console.log(`  --address <string>   The contract address to update data for (required)`)
  console.log(`  --block <number>     Block number to update data at (default: latest block)`)
  console.log(`  --save               Save results to file (optional)`)
  console.log(`Examples:`)
  console.log(`  npx babel-node src/tools/contracts/${toolName} --address 0x123...`)
  console.log(`  npx babel-node src/tools/contracts/${toolName} --address 0x123... --block 5000000`)
  console.log(`  npx babel-node src/tools/contracts/${toolName} --address 0x123... --save`)
  process.exit(1)
}

async function main () {
  const validOptions = {
    '--address': { name: 'address', type: 'string', default: null, required: true },
    '--block': { name: 'blockNumber', type: 'number', default: null, min: 0 },
    '--save': { name: 'save', type: 'boolean', default: false }
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
    console.log(`Updating data for contract: ${normalizedAddress}`)

    // Get block number if not provided
    let targetBlockNumber = options.blockNumber
    if (!targetBlockNumber) {
      targetBlockNumber = await getLatestBlockNumber()
      console.log(`Using latest block: ${targetBlockNumber}`)
    } else {
      console.log(`Using specified block: ${targetBlockNumber}`)
    }

    const contractData = await getContractData(normalizedAddress, targetBlockNumber)

    if (!contractData) {
      throw new Error('Failed to fetch contract data')
    }

    await updateContractData(contractData)

    const result = {
      blockNumber: targetBlockNumber,
      contractData
    }

    console.log('\n=== RESULT ===')
    console.dir(result, { depth: null })
    console.log(`\nFetch time: ${contractData.fetchTimeMs}ms, Update time: ${contractData.updateTimeMs}ms`)

    // Save result to file if --save flag is provided
    if (options.save) {
      const fileName = `contract-update-${normalizedAddress}-${Date.now()}.json`
      const resultFilePath = path.join(__dirname, fileName)
      fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2))
      console.log(`\nResults saved to: ${fileName}`)
    }

    process.exit(0)
  } catch (error) {
    console.log(`[${toolName}]: Error updating contract data`)
    console.error(error)
    process.exit(1)
  }
}

main()

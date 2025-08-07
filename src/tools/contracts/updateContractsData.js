import fs from 'fs'
import path from 'path'
import { getLatestBlockNumber, fetchPaginatedContracts, getContractData, updateContractData, parseArguments } from '../utils.js'

const toolName = process.argv[1].split('/').pop()
const resultFileName = `contracts-update-${Date.now()}.json`
const resultFilePath = path.join(__dirname, resultFileName)

function printUsageAndExit () {
  console.log(`Usage: npx babel-node src/tools/contracts/${toolName} [options]`)
  console.log(`Options:`)
  console.log(`  --block <number>     Block number to update data at (default: latest block)`)
  console.log(`  --pageSize <number>  Number of contracts to process per page (default: 50)`)
  console.log(`  --limit <number>     Maximum number of contracts to process (default: 0 = no limit)`)
  console.log(`  --save               Save results to file (optional)`)
  console.log(`Examples:`)
  console.log(`  npx babel-node src/tools/contracts/${toolName}`)
  console.log(`  npx babel-node src/tools/contracts/${toolName} --block 5000000`)
  console.log(`  npx babel-node src/tools/contracts/${toolName} --pageSize 25 --limit 100`)
  console.log(`  npx babel-node src/tools/contracts/${toolName} --block 5000000 --pageSize 25 --limit 100`)
  console.log(`  npx babel-node src/tools/contracts/${toolName} --save`)
  process.exit(1)
}

async function updateContractsData ({ blockNumber, pageSize = 50, limit = 0, save = false } = {}) {
  const results = {
    totalContracts: 0,
    processedContracts: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    errors: {},
    contracts: {}
  }

  try {
    let targetBlockNumber = blockNumber
    if (!targetBlockNumber) {
      targetBlockNumber = await getLatestBlockNumber()
      console.log(`Using latest block: ${targetBlockNumber}`)
    } else {
      console.log(`Using specified block: ${targetBlockNumber}`)
    }
    console.log(`Updating contracts at block ${targetBlockNumber}`)
    if (save) {
      console.log(`Results will be saved to: ${resultFileName}`)
    }

    let cursor = null
    let pageCount = 0
    let totalProcessed = 0

    do {
      pageCount++
      const { contracts, next } = await fetchPaginatedContracts(pageSize, cursor)

      if (contracts.length === 0) {
        console.log('No more contracts to process')
        break
      }

      console.log(`Processing page ${pageCount} (${contracts.length} contracts)...`)

      for (const contract of contracts) {
        if (limit > 0 && totalProcessed >= limit) {
          console.log(`Reached limit of ${limit} contracts`)
          break
        }

        const contractAddress = contract.address
        results.totalContracts++
        totalProcessed++

        try {
          const contractData = await getContractData(contractAddress, targetBlockNumber)

          await updateContractData(contractData)

          results.successfulUpdates++
          results.contracts[contractAddress] = contractData
          console.log(`Contract ${contractAddress} updated (fetch: ${contractData.fetchTimeMs}ms, update: ${contractData.updateTimeMs}ms).`)
        } catch (error) {
          results.failedUpdates++
          results.errors[contractAddress] = error.message
          console.log(`Contract ${contractAddress} update failed. Error: ${error.message}`)
        }

        results.processedContracts++
      }

      // Save current page progress if --save flag is provided
      if (save) {
        fs.writeFileSync(resultFilePath, JSON.stringify(results, null, 2))
        console.log(`Page ${pageCount} completed. Progress saved to ${resultFileName}`)
      } else {
        console.log(`Page ${pageCount} completed.`)
      }

      if (limit > 0 && totalProcessed >= limit) {
        break
      }

      cursor = next
    } while (cursor)

    return results
  } catch (error) {
    console.error(`[${toolName}]: Error during bulk contract data update`)
    console.error(error)
    return results
  }
}

async function main () {
  const validOptions = {
    '--block': { name: 'blockNumber', type: 'number', default: null, min: 0 },
    '--pageSize': { name: 'pageSize', type: 'number', default: 50, min: 1 },
    '--limit': { name: 'limit', type: 'number', default: 0, min: 0 },
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
    console.log(`${toolName}`)
    if (options.blockNumber) {
      console.log(`Block number: ${options.blockNumber}`)
    } else {
      console.log(`Block number: latest`)
    }
    console.log(`Page size: ${options.pageSize}`)
    if (options.limit > 0) {
      console.log(`Limit: ${options.limit} contracts`)
    }
    console.log('Depending on the page size and limit, this tool could take a while to complete.')
    if (options.save) {
      console.log(`Results will be saved to: ${resultFileName}`)
    }
    console.log('Starting...')

    const result = await updateContractsData({ blockNumber: options.blockNumber, pageSize: options.pageSize, limit: options.limit, save: options.save })

    console.log(`\n=== RESULTS ===`)
    console.log(`Total: ${result.totalContracts}`)
    console.log(`Processed: ${result.processedContracts}`)
    console.log(`Successful: ${result.successfulUpdates}`)
    console.log(`Failed: ${result.failedUpdates}`)

    if (Object.keys(result.errors).length > 0) {
      console.log(`\nErrors: ${Object.keys(result.errors).length}`)
    }

    if (options.save) {
      console.log(`Final results saved to: ${resultFileName}`)
    }

    process.exit(0)
  } catch (error) {
    console.log(`[${toolName}]: Error updating contract data`)
    console.error(error)
    process.exit(1)
  }
}

main()

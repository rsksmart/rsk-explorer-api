import fs from 'fs'
import path from 'path'
import { getLatestBlockNumber, fetchPaginatedContracts, getContractData, parseArguments } from './utils.js'

const toolName = process.argv[1].split('/').pop()

function printUsageAndExit () {
  console.log(`Usage: npx babel-node src/tools/${toolName} [options]`)
  console.log(`Options:`)
  console.log(`  --pageSize <number>  Number of contracts to process per page (default: 50)`)
  console.log(`  --limit <number>     Maximum number of contracts to process (default: 0 = no limit)`)
  console.log(`Examples:`)
  console.log(`  npx babel-node src/tools/${toolName}`)
  console.log(`  npx babel-node src/tools/${toolName} --pageSize 25`)
  console.log(`  npx babel-node src/tools/${toolName} --pageSize 25 --limit 100`)
  process.exit(1)
}

async function getContractsData ({ pageSize = 50, limit = 0 } = {}) {
  try {
    const latestBlockNumber = await getLatestBlockNumber()
    console.log(`Processing contracts at block ${latestBlockNumber}`)

    const results = {
      totalContracts: 0,
      processedContracts: 0,
      successfulFetches: 0,
      failedFetches: 0,
      errors: {},
      contracts: {}
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
          const contractData = await getContractData(contractAddress, latestBlockNumber)

          if (!contractData) {
            results.failedFetches++
            results.errors[contractAddress] = 'Failed to fetch contract data'
            continue
          }

          results.successfulFetches++
          results.contracts[contractAddress] = contractData
        } catch (error) {
          results.failedFetches++
          results.errors[contractAddress] = error.message
        }

        results.processedContracts++
      }

      if (limit > 0 && totalProcessed >= limit) {
        break
      }

      cursor = next
    } while (cursor)

    return results
  } catch (error) {
    console.error('Error during contract data fetch:', error.message)
    throw error
  }
}

async function main () {
  const validOptions = {
    '--pageSize': { name: 'pageSize', type: 'number', default: 50, min: 1 },
    '--limit': { name: 'limit', type: 'number', default: 0, min: 0 }
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
    console.log(`Page size: ${options.pageSize}`)
    if (options.limit > 0) {
      console.log(`Limit: ${options.limit} contracts`)
    }
    console.log('Depending on the page size and limit, this tool could take a while to complete.')
    console.log('Starting...')

    const result = await getContractsData({ pageSize: options.pageSize, limit: options.limit })

    console.log(`\n=== RESULTS ===`)
    console.log(`Total: ${result.totalContracts}`)
    console.log(`Processed: ${result.processedContracts}`)
    console.log(`Successful: ${result.successfulFetches}`)
    console.log(`Failed: ${result.failedFetches}`)

    if (Object.keys(result.errors).length > 0) {
      console.log(`\nErrors: ${Object.keys(result.errors).length}`)
    }

    const fileName = `contracts-data-${Date.now()}.json`
    const resultFilePath = path.join(__dirname, fileName)
    fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2))
    console.log(`Results saved to: ${fileName}`)

    process.exit(0)
  } catch (error) {
    console.log(`[${toolName}]: Error fetching contract data`)
    console.error(error)
    process.exit(1)
  }
}

main()

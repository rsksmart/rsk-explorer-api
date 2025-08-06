import fs from 'fs'
import path from 'path'
import { getLatestBlockNumber, fetchPaginatedContracts, getContractData, updateContractData } from './utils.js'

const toolName = process.argv[1].split('/').pop()

function printUsageAndExit () {
  console.log(`Usage: node dist/tools/${toolName}.js [pageSize(number: optional)] [limit(number: optional)]`)
  console.log(`  pageSize: Number of contracts to process per page (default: 50)`)
  console.log(`  limit: Maximum number of contracts to process (default: 0 = no limit)`)
  process.exit(1)
}

async function updateContractsData ({ pageSize = 50, limit = 0 } = {}) {
  const results = {
    totalContracts: 0,
    processedContracts: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    errors: {},
    contracts: {}
  }

  try {
    const latestBlockNumber = await getLatestBlockNumber()
    console.log(`Updating contracts at block ${latestBlockNumber}`)

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

          await updateContractData(contractData)

          results.successfulUpdates++
          results.contracts[contractAddress] = contractData
          console.log(`Contract ${contractAddress} updated.`)
        } catch (error) {
          results.failedUpdates++
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
    console.error(`[${toolName}]: Error during bulk contract data update`)
    console.error(error)
    return results
  }
}

async function main () {
  const pageSize = process.argv[2]
  const limit = process.argv[3]

  const parsedPageSize = pageSize ? parseInt(pageSize) : 50
  const parsedLimit = limit ? parseInt(limit) : 0

  if (pageSize && (isNaN(parsedPageSize) || parsedPageSize <= 0)) {
    console.log('Invalid pageSize provided. Must be a positive number')
    printUsageAndExit()
  }

  if (limit && (isNaN(parsedLimit) || parsedLimit < 0)) {
    console.log('Invalid limit provided. Must be a non-negative number')
    printUsageAndExit()
  }

  try {
    console.log(`${toolName}`)
    console.log(`Page size: ${parsedPageSize}`)
    if (parsedLimit > 0) {
      console.log(`Limit: ${parsedLimit} contracts`)
    }
    console.log('Depending on the page size and limit, this tool could take a while to complete.')
    console.log('Starting...')

    const result = await updateContractsData({ pageSize: parsedPageSize, limit: parsedLimit })

    console.log(`\n=== RESULTS ===`)
    console.log(`Total: ${result.totalContracts}`)
    console.log(`Processed: ${result.processedContracts}`)
    console.log(`Successful: ${result.successfulUpdates}`)
    console.log(`Failed: ${result.failedUpdates}`)

    if (Object.keys(result.errors).length > 0) {
      console.log(`\nErrors: ${Object.keys(result.errors).length}`)
    }

    const fileName = `contracts-update-${Date.now()}.json`
    const resultFilePath = path.join(__dirname, fileName)
    fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2))
    console.log(`Results saved to: ${fileName}`)

    process.exit(0)
  } catch (error) {
    console.log(`[${toolName}]: Error updating contract data`)
    console.error(error)
    process.exit(1)
  }
}

main()

import config from '../lib/config'
import Logger from '../lib/Logger'
import { createBtcRpcClient } from '../lib/btcRpcClient'
import { ingestBtcBlocks, reorgSafeHeight, missingHeights } from '../lib/btcBlockIngest'
import { prismaClient } from '../lib/prismaClient'
import { parseArguments } from './utils'

const log = Logger('[backfill-btc-blocks]')
const toolName = process.argv[1].split('/').pop()

function printUsageAndExit () {
  console.log(`Usage: npx babel-node src/tools/${toolName} [options]`)
  console.log(`Fills btc_block over a height range. Only heights that are absent are fetched, so a`)
  console.log(`run is resumable: rerun the same command after an interruption and it continues.`)
  console.log(`Options:`)
  console.log(`  --from <height>       lowest height (default: bitcoin.startHeight)`)
  console.log(`  --to <height>         highest height (default: tip - bitcoin.confirmations)`)
  console.log(`  --concurrency <n>     parallel block reads (default: bitcoin.ingestConcurrency)`)
  console.log(`  --batch-size <n>      rows per insert (default: bitcoin.ingestBatchSize)`)
  console.log(`A full run from 2018 takes hours: use a detached session with the log outside the container.`)
  process.exit(1)
}

const VALID_OPTIONS = {
  '--from': { name: 'from', type: 'number', min: 0 },
  '--to': { name: 'to', type: 'number', min: 0 },
  '--concurrency': { name: 'concurrency', type: 'number', default: config.bitcoin.ingestConcurrency, min: 1 },
  '--batch-size': { name: 'batchSize', type: 'number', default: config.bitcoin.ingestBatchSize, min: 1 }
}

async function main () {
  let options
  try {
    options = parseArguments(VALID_OPTIONS)
  } catch (error) {
    console.log(`Error: ${error.message}`)
    printUsageAndExit()
  }
  const { bitcoin } = config
  const client = createBtcRpcClient({
    url: bitcoin.rpcUrl,
    requestTimeoutMs: bitcoin.requestTimeoutMs,
    maxRetries: bitcoin.maxRetries,
    retryDelayMs: bitcoin.retryDelayMs,
    sustainedRequestsPerSecond: bitcoin.sustainedRequestsPerSecond,
    log
  })

  const tipHeight = await client.getBlockCount()
  const fromHeight = options.from !== undefined ? options.from : bitcoin.startHeight
  const toHeight = options.to !== undefined ? options.to : reorgSafeHeight(tipHeight, bitcoin.confirmations)
  const concurrency = options.concurrency
  const batchSize = options.batchSize

  if (toHeight < fromHeight) throw new Error(`Empty range: ${fromHeight}-${toHeight}`)

  const pending = await missingHeights(fromHeight, toHeight)
  log.info(`Endpoint ${client.endpoint}, tip ${tipHeight}`)
  log.info(`Range ${fromHeight}-${toHeight}: ${pending.length} of ${toHeight - fromHeight + 1} block(s) missing`)
  log.info(`Concurrency ${concurrency}, batch size ${batchSize}`)

  const started = Date.now()
  const result = await ingestBtcBlocks({ client, fromHeight, toHeight, concurrency, batchSize, log })
  const elapsed = (Date.now() - started) / 1000

  log.info(`Done in ${elapsed.toFixed(1)} s: ${result.ingested} stored, ${result.failed} failed`)
  if (result.failed > 0) {
    log.warn(`${result.failed} height(s) failed and remain missing; rerun this command to retry only those`)
  }
}

main()
  .catch(error => {
    log.error(error.message)
    log.error(error.stack)
    process.exitCode = 1
  })
  .finally(() => prismaClient.$disconnect())

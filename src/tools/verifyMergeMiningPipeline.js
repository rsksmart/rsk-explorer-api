import config from '../lib/config'
import Logger from '../lib/Logger'
import { createBtcRpcClient } from '../lib/btcRpcClient'
import { ingestBtcBlocks, missingHeights, reorgSafeHeight } from '../lib/btcBlockIngest'
import { btcBlockStore } from '../lib/btcBlockStore'
import { getMergeMiningStats } from '../lib/getMergeMiningStats'
import { prismaClient } from '../lib/prismaClient'
import { parseArguments } from './utils'

const log = Logger('[verify-merge-mining]')
const toolName = process.argv[1].split('/').pop()

function printUsageAndExit () {
  console.log(`Usage: npx babel-node src/tools/${toolName} [options]`)
  console.log(`Exercises the pipeline end to end against a real endpoint and database over a small`)
  console.log(`window. Deletes rows to prove the healing and refusal paths, so point it at a scratch`)
  console.log(`database. Exits non-zero on any failed check.`)
  console.log(`Options:`)
  console.log(`  --from <height>       lowest height (default: 20 blocks below the safe tip)`)
  console.log(`  --to <height>         highest height (default: the safe tip)`)
  process.exit(1)
}

const VALID_OPTIONS = {
  '--from': { name: 'from', type: 'number', min: 0 },
  '--to': { name: 'to', type: 'number', min: 0 }
}
const silent = { info: () => {}, warn: () => {}, error: () => {} }

let failures = 0
function check (description, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  log.info(`${ok ? 'PASS' : 'FAIL'}  ${description}${ok ? '' : ` — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`)
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
    log: silent
  })

  const tip = await client.getBlockCount()
  const fromHeight = options.from !== undefined ? options.from : reorgSafeHeight(tip, bitcoin.confirmations) - 19
  const toHeight = options.to !== undefined ? options.to : reorgSafeHeight(tip, bitcoin.confirmations)
  const windowBlocks = toHeight - fromHeight + 1

  log.info(`Endpoint ${client.endpoint}, tip ${tip}`)
  log.info(`Verifying over ${windowBlocks} block(s): ${fromHeight}-${toHeight}`)
  const first = await ingestBtcBlocks({ client, fromHeight, toHeight, concurrency: 4, batchSize: 10, log: silent })
  check('ingest leaves the window complete', await missingHeights(fromHeight, toHeight), [])
  check('ingest reports no failures', first.failed, 0)

  const second = await ingestBtcBlocks({ client, fromHeight, toHeight, concurrency: 4, batchSize: 10, log: silent })
  check('rerun over a complete range fetches nothing', second, { requested: 0, ingested: 0, failed: 0 })
  const holes = [fromHeight + 3, fromHeight + 7, fromHeight + 11]
  await prismaClient.btc_block.deleteMany({ where: { height: { in: holes } } })
  check('gaps are visible before the healing run', await missingHeights(fromHeight, toHeight), holes)

  const healing = await ingestBtcBlocks({ client, fromHeight, toHeight, concurrency: 4, batchSize: 10, log: silent })
  check('healing run fetches only the missing heights', healing.requested, holes.length)
  check('healing run leaves no gaps', await missingHeights(fromHeight, toHeight), [])

  const stats = await getMergeMiningStats({ client, windowBlocks, log: silent })
  check('rollup counts the full window', stats.bitcoinBlocks, windowBlocks)
  check('rollup records the audited range', [stats.fromHeight, stats.toHeight], [fromHeight, toHeight])
  const share = stats.mergeMinedBlocks / stats.bitcoinBlocks
  check('published share matches the stored counts', Number(stats.mergeMiningPercentage).toFixed(6), share.toFixed(6))
  log.info(`  observed: ${stats.mergeMinedBlocks}/${stats.bitcoinBlocks} merge-mined, hashrate ${stats.bitcoinHashrate}`)

  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  await btcBlockStore.upsertDailyStats(date, stats)
  const stored = await prismaClient.btc_merge_mining_stats.findFirst({ orderBy: { date: 'desc' } })
  check('snapshot is persisted for the day', stored.bitcoinBlocks, windowBlocks)

  await btcBlockStore.upsertDailyStats(date, stats)
  check('recomputing the same day rewrites one row rather than adding one', await prismaClient.btc_merge_mining_stats.count(), 1)
  await prismaClient.btc_block.deleteMany({ where: { height: fromHeight + 5 } })
  let refused = false
  try {
    await getMergeMiningStats({ client, windowBlocks, log: silent })
  } catch (error) {
    refused = /Incomplete window/.test(error.message)
  }
  check('rollup refuses a window with a gap', refused, true)

  log.info(failures === 0 ? 'All checks passed' : `${failures} check(s) failed`)
  process.exitCode = failures === 0 ? 0 : 1
}

main()
  .catch(error => {
    log.error(error.message)
    log.error(error.stack)
    process.exitCode = 1
  })
  .finally(() => prismaClient.$disconnect())

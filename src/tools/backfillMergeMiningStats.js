import config from '../lib/config'
import Logger from '../lib/Logger'
import { createBtcRpcClient } from '../lib/btcRpcClient'
import { assertStoredChainMatchesEndpoint } from '../lib/btcBlockIngest'
import { backfillMergeMiningStats } from '../lib/backfillMergeMiningStats'
import { prismaClient } from '../lib/prismaClient'
import { parseArguments } from './utils'

const log = Logger('[backfill-merge-mining-stats]')
const toolName = process.argv[1].split('/').pop()

function printUsageAndExit () {
  console.log(`Usage: npx babel-node src/tools/${toolName} [options]`)
  console.log(`Computes and stores the daily merge-mining snapshot for each of the last N complete`)
  console.log(`UTC days (today is left to the daily cron). Each day's trailing window is measured from`)
  console.log(`the chain tip as it stood at the end of that day, so the btc_block table must already`)
  console.log(`hold the blocks those windows span — run backfill-btc-blocks first. A day whose window`)
  console.log(`falls under the coverage floor is skipped, not fatal. Existing days are kept unless --force.`)
  console.log(`Options:`)
  console.log(`  --days <n>     number of days back to fill (default: 30)`)
  console.log(`  --window <n>   blocks in the trailing window (default: bitcoin.windowBlocks)`)
  console.log(`  --force        recompute and overwrite days already stored`)
  process.exit(1)
}

const VALID_OPTIONS = {
  '--days': { name: 'days', type: 'number', default: 30, min: 1 },
  '--window': { name: 'window', type: 'number', default: config.bitcoin.windowBlocks, min: 1 },
  '--force': { name: 'force', type: 'boolean', default: false }
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

  await assertStoredChainMatchesEndpoint({ client })

  log.info(`Backfilling the last ${options.days} day(s) over a ${options.window}-block window`)
  const result = await backfillMergeMiningStats({
    client,
    days: options.days,
    windowBlocks: options.window,
    force: options.force,
    log
  })

  if (result.failed > 0) {
    log.error(`${result.failed} day(s) failed for operational reasons; exiting non-zero so this run is retried`)
    process.exitCode = 1
  }
}

main()
  .catch(error => {
    log.error(error.message)
    log.error(error.stack)
    process.exitCode = 1
  })
  .finally(() => prismaClient.$disconnect())

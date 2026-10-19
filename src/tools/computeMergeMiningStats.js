import config from '../lib/config'
import Logger from '../lib/Logger'
import { createBtcRpcClient } from '../lib/btcRpcClient'
import { assertStoredChainMatchesEndpoint } from '../lib/btcBlockIngest'
import { getMergeMiningStats } from '../lib/getMergeMiningStats'
import { btcBlockRepository } from '../repositories'
import { prismaClient } from '../lib/prismaClient'
import { parseArguments } from './utils'

const log = Logger('[compute-merge-mining-stats]')
const toolName = process.argv[1].split('/').pop()

function printUsageAndExit () {
  console.log(`Usage: npx babel-node src/tools/${toolName} [options]`)
  console.log(`Computes the merge-mining snapshot over the trailing window from the highest stored`)
  console.log(`height and prints it. This is what the daily cron computes; here it runs on demand.`)
  console.log(`Read-only unless --persist is given.`)
  console.log(`Options:`)
  console.log(`  --window <n>   blocks in the trailing window (default: bitcoin.windowBlocks)`)
  console.log(`  --persist      upsert the snapshot for today (UTC) into btc_merge_mining_stats`)
  process.exit(1)
}

const VALID_OPTIONS = {
  '--window': { name: 'window', type: 'number', default: config.bitcoin.windowBlocks, min: 1 },
  '--persist': { name: 'persist', type: 'boolean', default: false }
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

  const stats = await getMergeMiningStats({ client, windowBlocks: options.window, log })

  log.info(`Window ${stats.fromHeight}-${stats.toHeight} (${stats.bitcoinBlocks} blocks)`)
  log.info(`  merge-mined:            ${stats.mergeMinedBlocks}/${stats.bitcoinBlocks} (${(Number(stats.mergeMiningPercentage) * 100).toFixed(2)}%)`)
  log.info(`  bitcoin hashrate:       ${stats.bitcoinHashrate}`)
  log.info(`  rootstock secured:      ${stats.rootstockSecuredHashrate}`)

  if (options.persist) {
    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)
    await btcBlockRepository.upsertDailyStats(date, stats)
    log.info(`Persisted snapshot for ${date.toISOString().slice(0, 10)}`)
  } else {
    log.info(`Dry run: nothing written. Pass --persist to store this snapshot.`)
  }
}

main()
  .catch(error => {
    log.error(error.message)
    log.error(error.stack)
    process.exitCode = 1
  })
  .finally(() => prismaClient.$disconnect())

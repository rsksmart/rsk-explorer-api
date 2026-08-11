/**
 * Backfills the btc_block table from a starting height up to the safe tip.
 *
 * Resumable by construction: the table is the progress marker, so a run that is
 * interrupted, killed or restarted picks up exactly the heights still missing, and
 * a rerun after a partial pass costs nothing for work already done.
 *
 * Long runs belong in a detached session with the log written outside the container,
 * because the process lives for hours:
 *
 *   npm run backfill-btc-blocks -- --from 501960 --concurrency 32
 *
 * Options:
 *   --from <height>       lowest height to ingest (default: bitcoin.startHeight)
 *   --to <height>         highest height to ingest (default: tip - confirmations)
 *   --concurrency <n>     parallel block reads (default: bitcoin.ingestConcurrency)
 *   --batch-size <n>      rows per insert and per progress line (default: bitcoin.ingestBatchSize)
 */
import config from '../lib/config'
import Logger from '../lib/Logger'
import { createBtcRpcClient } from '../lib/btcRpcClient'
import { ingestBtcBlocks, safeTipHeight, missingHeights } from '../lib/btcBlockIngest'
import { prismaClient } from '../lib/prismaClient'

const log = Logger('[backfill-btc-blocks]')

function readOption (name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  const value = Number(process.argv[index + 1])
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid --${name}: ${process.argv[index + 1]}`)
  return value
}

async function main () {
  const { bitcoin } = config
  const client = createBtcRpcClient({
    url: bitcoin.rpcUrl,
    requestTimeoutMs: bitcoin.requestTimeoutMs,
    maxRetries: bitcoin.maxRetries,
    retryDelayMs: bitcoin.retryDelayMs,
    requestsPerSecond: bitcoin.requestsPerSecond,
    log
  })

  const tipHeight = await client.getBlockCount()
  const fromHeight = readOption('from', bitcoin.startHeight)
  const toHeight = readOption('to', safeTipHeight(tipHeight, bitcoin.confirmations))
  const concurrency = readOption('concurrency', bitcoin.ingestConcurrency)
  const batchSize = readOption('batch-size', bitcoin.ingestBatchSize)

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

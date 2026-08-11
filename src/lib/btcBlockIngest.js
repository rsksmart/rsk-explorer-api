import Logger from './Logger'
import { btcBlockStore } from './btcBlockStore'
import { findRskMergeMiningTag } from './rskMergeMiningTag'

const DEFAULT_CONCURRENCY = 8
const DEFAULT_BATCH_SIZE = 500

// Bounded fan-out without a dependency: workers pull from a shared cursor, so a slow
// request delays only its own worker instead of a whole generation of requests.
async function mapWithConcurrency (items, limit, worker) {
  const results = new Array(items.length)
  let next = 0
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index])
    }
  })
  await Promise.all(runners)
  return results
}

// The table is its own progress marker: whatever is absent is what remains to be
// fetched. That makes a run idempotent and self-healing — it closes gaps left by an
// earlier partial pass instead of only extending the highest height reached, and it
// removes the need for a separate cursor that could disagree with the data.
export async function missingHeights (fromHeight, toHeight, store = btcBlockStore) {
  if (toHeight < fromHeight) return []

  const stored = new Set(await store.presentHeights(fromHeight, toHeight))
  const missing = []
  for (let height = fromHeight; height <= toHeight; height++) {
    if (!stored.has(height)) missing.push(height)
  }
  return missing
}

export async function readBtcBlock (client, height) {
  const hash = await client.getBlockHash(height)
  const block = await client.getBlock(hash)
  const coinbase = await client.getCoinbase(block.coinbaseTxid, hash)
  const { isMergeMined, rskHashForMergedMining } = findRskMergeMiningTag(coinbase)

  return {
    height,
    hash,
    minedAt: new Date(block.time * 1000),
    isMergeMined,
    rskHashForMergedMining,
    difficulty: block.difficulty
  }
}

// Highest height safe to read: deep enough that a reorg is not expected to rewrite it.
export function safeTipHeight (tipHeight, confirmations) {
  return tipHeight - confirmations
}

// Range the scheduled ingest works over. Deliberately a bounded lookback rather than
// everything above the highest stored height: a height that failed earlier sits *below*
// that maximum and would never be retried, and on an empty database "everything since
// 2018" would turn one tick into an hours-long job overlapping the next.
//
// The lookback always covers the published window, so a gap that would stop the rollup is
// inside the range the next tick repairs, whatever the configured lookback says. Reaching
// further back is the backfill tool's job, where the cost is visible and supervised.
export function ingestWindow ({ safeTip, startHeight, lookbackBlocks, windowBlocks = 0 }) {
  const span = Math.max(lookbackBlocks || 0, windowBlocks || 0, 1)
  return {
    fromHeight: Math.max(startHeight, safeTip - span + 1),
    toHeight: safeTip
  }
}

export async function ingestBtcBlocks ({
  client,
  fromHeight,
  toHeight,
  concurrency = DEFAULT_CONCURRENCY,
  batchSize = DEFAULT_BATCH_SIZE,
  store = btcBlockStore,
  log = Logger('[btc-block-ingest]')
}) {
  if (!client) throw new Error('Missing Bitcoin client')
  if (!Number.isInteger(fromHeight) || fromHeight < 0) throw new Error(`Invalid fromHeight: ${fromHeight}`)
  if (!Number.isInteger(toHeight)) throw new Error(`Invalid toHeight: ${toHeight}`)
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error(`Invalid batchSize: ${batchSize}`)

  const pending = await missingHeights(fromHeight, toHeight, store)
  if (pending.length === 0) {
    log.info(`Nothing to ingest for heights ${fromHeight}-${toHeight}`)
    return { requested: 0, ingested: 0, failed: 0 }
  }

  log.info(`Ingesting ${pending.length} missing block(s) in ${fromHeight}-${toHeight} at concurrency ${concurrency}`)

  let ingested = 0
  let failed = 0

  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize)
    const rows = (await mapWithConcurrency(batch, concurrency, async height => {
      try {
        return await readBtcBlock(client, height)
      } catch (error) {
        // A height that fails stays missing, so the next run retries it without
        // any bookkeeping of its own
        failed++
        log.warn(`Skipping BTC block ${height}: ${error.message}`)
        return null
      }
    })).filter(Boolean)

    ingested += await store.insertMany(rows)
    // Throttling is reported as a running total: one log line per throttled request would
    // bury the progress it is meant to explain
    const throttling = client.stats ? ` (${client.stats().throttled} throttled, ${client.stats().retries} retries)` : ''
    log.info(`Progress: ${Math.min(offset + batchSize, pending.length)}/${pending.length} processed, ${ingested} stored, ${failed} failed${throttling}`)
  }

  return { requested: pending.length, ingested, failed }
}

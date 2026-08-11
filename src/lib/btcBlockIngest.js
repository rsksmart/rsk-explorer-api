import Logger from './Logger'
import { btcBlockStore } from './btcBlockStore'
import { findRskMergeMiningTag } from './rskMergeMiningTag'

const DEFAULT_CONCURRENCY = 8
const DEFAULT_BATCH_SIZE = 500

async function mapWithWorkersPullingFromQueue (items, limit, worker) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

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

export function reorgSafeHeight (tipHeight, confirmations) {
  return tipHeight - confirmations
}

export function boundedLookbackWindow ({ safeTip, startHeight, lookbackBlocks, windowBlocks = 0 }) {
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
  let failedLeftForNextRun = 0

  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize)
    const rows = (await mapWithWorkersPullingFromQueue(batch, concurrency, async height => {
      try {
        return await readBtcBlock(client, height)
      } catch (error) {
        failedLeftForNextRun++
        log.warn(`Skipping BTC block ${height}: ${error.message}`)
        return null
      }
    })).filter(Boolean)

    ingested += await store.insertMany(rows)
    const throttling = client.totals ? ` (${client.totals().throttled} throttled, ${client.totals().retries} retries)` : ''
    log.info(`Progress: ${Math.min(offset + batchSize, pending.length)}/${pending.length} processed, ${ingested} stored, ${failedLeftForNextRun} failed${throttling}`)
  }

  return { requested: pending.length, ingested, failed: failedLeftForNextRun }
}

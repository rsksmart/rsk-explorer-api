import Logger from './Logger'
import { btcBlockRepository } from '../repositories'
import { getMergeMiningStats } from './getMergeMiningStats'

const DAY_MS = 24 * 60 * 60 * 1000

// The complete UTC days ending yesterday, oldest first. Each entry carries the date key the snapshot
// is stored under (UTC midnight, matching the daily cron) and the end-of-day instant whose chain tip
// the trailing window is measured from. Today is left to the daily cron, as it is still in progress.
export function utcDayWindows (now, days) {
  const midnightToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const windows = []
  for (let daysAgo = days; daysAgo >= 1; daysAgo--) {
    const dayStart = midnightToday - daysAgo * DAY_MS
    windows.push({ date: new Date(dayStart), endOfDay: new Date(dayStart + DAY_MS - 1) })
  }
  return windows
}

// Lets getMergeMiningStats' coverage warnings through while silencing its per-window info line, which
// the backfill replaces with a line that names the day.
const warnOnly = log => ({ info: () => {}, warn: (...args) => log.warn(...args), error: (...args) => log.error(...args) })

export async function backfillMergeMiningStats ({
  client,
  days = 30,
  windowBlocks,
  force = false,
  now = new Date(),
  store = btcBlockRepository,
  log = Logger('[backfill-merge-mining-stats]')
}) {
  if (!client) throw new Error('Missing Bitcoin client')
  if (!Number.isInteger(days) || days < 1) throw new Error(`Invalid days: ${days}`)

  const windows = utcDayWindows(now, days)
  const quietForStats = warnOnly(log)
  let persisted = 0
  let skipped = 0
  let failed = 0

  for (const { date, endOfDay } of windows) {
    const label = date.toISOString().slice(0, 10)
    try {
      if (!force && await store.findDailyStats(date)) {
        skipped++
        log.info(`${label}: already present, skipping (use --force to recompute)`)
        continue
      }

      const endingHeight = await store.maxHeightAtOrBefore(endOfDay)
      if (endingHeight === null || endingHeight === undefined) {
        skipped++
        log.warn(`${label}: no blocks stored on or before this day, skipping`)
        continue
      }

      const stats = await getMergeMiningStats({ client, windowBlocks, endingHeight, store, log: quietForStats })
      await store.upsertDailyStats(date, stats)
      persisted++
      log.info(`${label}: ${stats.mergeMinedBlocks}/${stats.bitcoinBlocks} merge-mined ` +
        `(${(Number(stats.mergeMiningPercentage) * 100).toFixed(2)}%) over ${stats.fromHeight}-${stats.toHeight}`)
    } catch (error) {
      failed++
      log.warn(`${label}: skipped — ${error.message}`)
    }
  }

  log.info(`Done: ${persisted} persisted, ${skipped} skipped, ${failed} failed, over ${windows.length} day(s)`)
  return { persisted, skipped, failed, requested: windows.length }
}

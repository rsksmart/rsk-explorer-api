import { prismaClient } from './prismaClient'

// Storage boundary for Bitcoin block data. Keeping it separate from the ingest and
// aggregation rules lets those be exercised without a database, and leaves one place
// to look when the persistence details change.
export const btcBlockStore = {
  presentHeights: async (fromHeight, toHeight) => {
    const rows = await prismaClient.btc_block.findMany({
      where: { height: { gte: fromHeight, lte: toHeight } },
      select: { height: true }
    })
    return rows.map(row => row.height)
  },

  // Rows already present are left untouched: a height is written once, and blocks are
  // only read once they are deep enough that the value is settled.
  insertMany: async rows => {
    if (rows.length === 0) return 0
    const { count } = await prismaClient.btc_block.createMany({ data: rows, skipDuplicates: true })
    return count
  },

  maxHeight: async () => {
    const result = await prismaClient.btc_block.aggregate({ _max: { height: true } })
    return result._max.height
  },

  minHeight: async () => {
    const result = await prismaClient.btc_block.aggregate({ _min: { height: true } })
    return result._min.height
  },

  countInRange: (fromHeight, toHeight) =>
    prismaClient.btc_block.count({ where: { height: { gte: fromHeight, lte: toHeight } } }),

  countMergeMinedInRange: (fromHeight, toHeight) =>
    prismaClient.btc_block.count({ where: { height: { gte: fromHeight, lte: toHeight }, isMergeMined: true } }),

  // One row per UTC day, rewritten if the day is recomputed
  upsertDailyStats: (date, stats) =>
    prismaClient.btc_merge_mining_stats.upsert({
      where: { date },
      update: stats,
      create: { date, ...stats }
    })
}

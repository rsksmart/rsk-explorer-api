export function getBtcBlockRepository (prismaClient) {
  return {
    presentHeights: async (fromHeight, toHeight) => {
      const rows = await prismaClient.btc_block.findMany({
        where: { height: { gte: fromHeight, lte: toHeight } },
        select: { height: true }
      })
      return rows.map(row => row.height)
    },

    insertMany: async rows => {
      if (rows.length === 0) return 0
      const { count } = await prismaClient.btc_block.createMany({ data: rows, skipDuplicates: true })
      return count
    },

    maxHeight: async () => {
      const result = await prismaClient.btc_block.aggregate({ _max: { height: true } })
      return result._max.height
    },

    oldestStoredBlock: () =>
      prismaClient.btc_block.findFirst({
        orderBy: { height: 'asc' },
        select: { height: true, hash: true }
      }),

    countInRange: (fromHeight, toHeight) =>
      prismaClient.btc_block.count({ where: { height: { gte: fromHeight, lte: toHeight } } }),

    countsInRange: async (fromHeight, toHeight) => {
      const groups = await prismaClient.btc_block.groupBy({
        by: ['isMergeMined'],
        where: { height: { gte: fromHeight, lte: toHeight } },
        _count: { _all: true }
      })
      const countOf = flag => {
        const group = groups.find(candidate => candidate.isMergeMined === flag)
        return group ? group._count._all : 0
      }
      const mergeMined = countOf(true)
      return { total: mergeMined + countOf(false), mergeMined }
    },

    upsertDailyStats: (date, stats) =>
      prismaClient.btc_merge_mining_stats.upsert({
        where: { date },
        update: stats,
        create: { date, ...stats }
      })
  }
}

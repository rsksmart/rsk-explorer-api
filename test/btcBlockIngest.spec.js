import { expect } from 'chai'
import { ingestBtcBlocks, assertStoredChainMatchesEndpoint, boundedLookbackWindow, missingHeights, readBtcBlock, reorgSafeHeight } from '../src/lib/btcBlockIngest'
import { RSKBLOCK_MARKER_HEX } from '../src/lib/rskMergeMiningTag'

const silentLog = { info: () => {}, warn: () => {}, error: () => {} }
const RSK_MERGED_MINING_HASH = '410ac1c4b7fb2330ffa2b6434afb44429b702189371c4158d102fe13008922b6'
const hashFor = height => String(height).padStart(64, '0')

function fakeStore (initialHeights = []) {
  const rows = new Map(initialHeights.map(height => [height, { height, hash: hashFor(height) }]))
  return {
    rows,
    presentHeights: async (from, to) => [...rows.keys()].filter(height => height >= from && height <= to),
    oldestStoredBlock: async () => {
      if (rows.size === 0) return null
      const oldest = Math.min(...rows.keys())
      return { height: oldest, hash: rows.get(oldest).hash }
    },
    insertMany: async incoming => {
      let inserted = 0
      for (const row of incoming) {
        if (!rows.has(row.height)) {
          rows.set(row.height, row)
          inserted++
        }
      }
      return inserted
    },
    maxHeight: async () => (rows.size === 0 ? null : Math.max(...rows.keys())),
    countInRange: async (from, to) => [...rows.keys()].filter(h => h >= from && h <= to).length,
    countsInRange: async (from, to) => {
      const inRange = [...rows.values()].filter(r => r.height >= from && r.height <= to)
      return { total: inRange.length, mergeMined: inRange.filter(r => r.isMergeMined).length }
    }
  }
}

function fakeClient ({ taggedHeights = [], failHeights = [] } = {}) {
  const requested = []
  return {
    requested,
    getBlockCount: async () => 1000,
    getBlockHash: async height => {
      requested.push(height)
      if (failHeights.includes(height)) throw new Error(`provider failed for ${height}`)
      return hashFor(height)
    },
    getBlock: async hash => ({
      height: Number(hash),
      hash,
      time: 1700000000 + Number(hash),
      difficulty: 1234.5,
      coinbaseTxid: hash
    }),
    getCoinbase: async (txid, blockHash) => {
      const tagged = taggedHeights.includes(Number(blockHash))
      return {
        vin: [{ coinbase: '03aabbcc' }],
        vout: [{ scriptPubKey: { hex: tagged ? `6a29${RSKBLOCK_MARKER_HEX}${RSK_MERGED_MINING_HASH}` : '76a914aabb' } }]
      }
    },
    getNetworkHashps: async () => 8.88e20
  }
}

describe('btcBlockIngest', function () {
  describe('reorgSafeHeight()', function () {
    it('holds back the configured number of confirmations', function () {
      expect(reorgSafeHeight(961919, 100)).to.equal(961819)
    })
  })

  describe('boundedLookbackWindow()', function () {
    const startHeight = 501960

    it('looks back over the configured span, not forward from the highest stored height', function () {
      expect(boundedLookbackWindow({ safeTip: 961822, startHeight, lookbackBlocks: 1500, windowBlocks: 1000 }))
        .to.deep.equal({ fromHeight: 960323, toHeight: 961822 })
    })

    it('covers a height that failed below the stored maximum, so the next run retries it', function () {
      const storedMax = 961822
      const failed = 961000
      const { fromHeight, toHeight } = boundedLookbackWindow({ safeTip: storedMax, startHeight, lookbackBlocks: 1500, windowBlocks: 1000 })
      expect(failed).to.be.at.least(fromHeight)
      expect(failed).to.be.at.most(toHeight)
    })

    it('never spans less than the published window, whatever the lookback is set to', function () {
      const { fromHeight, toHeight } = boundedLookbackWindow({ safeTip: 961822, startHeight, lookbackBlocks: 10, windowBlocks: 1000 })
      expect(toHeight - fromHeight + 1).to.equal(1000)
    })

    it('stays bounded on an empty database instead of reaching back to the start height', function () {
      const { fromHeight, toHeight } = boundedLookbackWindow({ safeTip: 961822, startHeight, lookbackBlocks: 1500, windowBlocks: 1000 })
      expect(toHeight - fromHeight + 1).to.equal(1500)
      expect(fromHeight).to.be.above(startHeight)
    })

    it('clamps to the start height when the chain is shorter than the lookback', function () {
      expect(boundedLookbackWindow({ safeTip: 502100, startHeight, lookbackBlocks: 1500, windowBlocks: 1000 }))
        .to.deep.equal({ fromHeight: startHeight, toHeight: 502100 })
    })
  })

  describe('assertStoredChainMatchesEndpoint()', function () {
    it('passes when the endpoint serves the same hash at the oldest stored height', async function () {
      const anchor = await assertStoredChainMatchesEndpoint({ client: fakeClient(), store: fakeStore([40, 41, 42]) })
      expect(anchor).to.equal(40)
    })

    it('accepts an empty table, where no chain has been committed to yet', async function () {
      expect(await assertStoredChainMatchesEndpoint({ client: fakeClient(), store: fakeStore() })).to.equal(null)
    })

    it('refuses when the endpoint serves a different hash at that height', async function () {
      const store = fakeStore([40])
      store.rows.get(40).hash = hashFor(999999)

      try {
        await assertStoredChainMatchesEndpoint({ client: fakeClient(), store })
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('Chain mismatch at height 40')
        expect(error.message).to.contain('frozen on the stored chain')
      }
    })

    it('refuses when the endpoint has no block at that height, as a shorter chain would not', async function () {
      try {
        await assertStoredChainMatchesEndpoint({
          client: fakeClient({ failHeights: [40] }),
          store: fakeStore([40])
        })
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('Chain identity unverifiable')
        expect(error.message).to.contain('height 40')
      }
    })

    it('stops an ingest that would silently skip every new block as a duplicate height', async function () {
      const store = fakeStore([40])
      store.rows.get(40).hash = hashFor(999999)

      try {
        await ingestBtcBlocks({ client: fakeClient(), fromHeight: 40, toHeight: 45, store, log: silentLog })
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('Chain mismatch at height 40')
      }
      expect(store.rows.size).to.equal(1)
    })
  })

  describe('missingHeights()', function () {
    it('returns the whole range when nothing is stored', async function () {
      expect(await missingHeights(10, 13, fakeStore())).to.deep.equal([10, 11, 12, 13])
    })

    it('returns only the gaps, so a rerun heals a partial pass', async function () {
      expect(await missingHeights(10, 15, fakeStore([10, 12, 15]))).to.deep.equal([11, 13, 14])
    })

    it('returns nothing for an inverted range', async function () {
      expect(await missingHeights(20, 10, fakeStore())).to.deep.equal([])
    })
  })

  describe('readBtcBlock()', function () {
    it('maps a merge-mined block onto the stored row', async function () {
      const row = await readBtcBlock(fakeClient({ taggedHeights: [500] }), 500)
      expect(row.height).to.equal(500)
      expect(row.hash).to.equal(hashFor(500))
      expect(row.isMergeMined).to.equal(true)
      expect(row.rskHashForMergedMining).to.equal(`0x${RSK_MERGED_MINING_HASH}`)
      expect(row.minedAt).to.be.instanceOf(Date)
      expect(row.difficulty).to.equal(1234.5)
    })

    it('maps a block without the tag', async function () {
      const row = await readBtcBlock(fakeClient(), 501)
      expect(row.isMergeMined).to.equal(false)
      expect(row.rskHashForMergedMining).to.equal(null)
    })
  })

  describe('ingestBtcBlocks()', function () {
    it('fetches only the heights that are missing, after checking the stored chain', async function () {
      const store = fakeStore([10, 11])
      const client = fakeClient()

      const result = await ingestBtcBlocks({ client, fromHeight: 10, toHeight: 14, store, log: silentLog })

      expect(client.requested[0]).to.equal(10)
      expect(client.requested.slice(1).sort((a, b) => a - b)).to.deep.equal([12, 13, 14])
      expect(result).to.deep.equal({ requested: 3, ingested: 3, failed: 0 })
    })

    it('does nothing when the range is already complete', async function () {
      const client = fakeClient()
      const result = await ingestBtcBlocks({ client, fromHeight: 10, toHeight: 12, store: fakeStore([10, 11, 12]), log: silentLog })

      expect(client.requested).to.deep.equal([])
      expect(result).to.deep.equal({ requested: 0, ingested: 0, failed: 0 })
    })

    it('keeps going when a single height fails, and leaves it missing for the next run', async function () {
      const store = fakeStore()
      const client = fakeClient({ failHeights: [11] })

      const result = await ingestBtcBlocks({ client, fromHeight: 10, toHeight: 12, store, log: silentLog })

      expect(result).to.deep.equal({ requested: 3, ingested: 2, failed: 1 })
      expect(await missingHeights(10, 12, store)).to.deep.equal([11])
    })

    it('processes every height exactly once across batches and concurrency', async function () {
      const store = fakeStore()
      const client = fakeClient()

      const result = await ingestBtcBlocks({
        client, fromHeight: 1, toHeight: 50, concurrency: 7, batchSize: 8, store, log: silentLog
      })

      expect(result.ingested).to.equal(50)
      expect(client.requested).to.have.lengthOf(50)
      expect(new Set(client.requested).size).to.equal(50)
    })

    it('counts merge-mined blocks it stored', async function () {
      const store = fakeStore()
      await ingestBtcBlocks({
        client: fakeClient({ taggedHeights: [2, 4] }), fromHeight: 1, toHeight: 5, store, log: silentLog
      })
      expect(await store.countsInRange(1, 5)).to.deep.equal({ total: 5, mergeMined: 2 })
    })

    it('refuses an inverted range instead of reporting a successful no-op', async function () {
      try {
        await ingestBtcBlocks({ client: fakeClient(), fromHeight: 100, toHeight: 10, store: fakeStore(), log: silentLog })
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('Inverted range: 100-10')
      }
    })

    it('rejects an invalid range or batch size', async function () {
      const client = fakeClient()
      const cases = [
        { fromHeight: -1, toHeight: 10 },
        { fromHeight: 1.5, toHeight: 10 },
        { fromHeight: 1, toHeight: 10, batchSize: 0 },
        { fromHeight: 1, toHeight: 10, concurrency: 0 }
      ]
      for (const options of cases) {
        try {
          await ingestBtcBlocks({ client, store: fakeStore(), log: silentLog, ...options })
          throw new Error('should have thrown')
        } catch (error) {
          expect(error.message).to.match(/Invalid (fromHeight|toHeight|batchSize|concurrency)/)
        }
      }
    })
  })
})

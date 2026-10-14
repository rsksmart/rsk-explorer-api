import { expect } from 'chai'
import { backfillMergeMiningStats, utcDayWindows } from '../src/lib/backfillMergeMiningStats'

const silentLog = { info: () => {}, warn: () => {}, error: () => {} }
const dayKey = date => date.toISOString().slice(0, 10)
const fakeClient = (hashrate = 1e21) => ({ getNetworkHashps: async () => hashrate })

function fakeStore ({ heightForDay = () => 1000, counts = { total: 1000, mergeMined: 600 }, existingDates = [] } = {}) {
  const persisted = new Map()
  const existing = new Set(existingDates)
  const countsFor = typeof counts === 'function' ? counts : () => counts
  return {
    persisted,
    maxHeight: async () => 1000,
    findDailyStats: async date => (existing.has(dayKey(date)) ? { date } : null),
    maxHeightAtOrBefore: async endOfDay => heightForDay(endOfDay),
    countsInRange: async (from, to) => countsFor(from, to),
    upsertDailyStats: async (date, stats) => { persisted.set(dayKey(date), stats) }
  }
}

describe('backfillMergeMiningStats', function () {
  describe('utcDayWindows()', function () {
    it('returns the complete UTC days ending yesterday, oldest first', function () {
      const windows = utcDayWindows(new Date('2026-10-14T09:30:00Z'), 3)

      expect(windows.map(w => w.date.toISOString())).to.deep.equal([
        '2026-10-11T00:00:00.000Z',
        '2026-10-12T00:00:00.000Z',
        '2026-10-13T00:00:00.000Z'
      ])
      expect(windows[2].endOfDay.toISOString()).to.equal('2026-10-13T23:59:59.999Z')
    })

    it('never includes today, whatever the hour', function () {
      const windows = utcDayWindows(new Date('2026-10-14T23:59:59Z'), 1)
      expect(windows.map(w => w.date.toISOString())).to.deep.equal(['2026-10-13T00:00:00.000Z'])
    })
  })

  describe('backfillMergeMiningStats()', function () {
    const now = new Date('2026-10-14T00:00:00Z')

    it('persists one snapshot per day over the requested range', async function () {
      const store = fakeStore()
      const result = await backfillMergeMiningStats({ client: fakeClient(), days: 3, windowBlocks: 1000, now, store, log: silentLog })

      expect(result).to.deep.equal({ persisted: 3, skipped: 0, failed: 0, requested: 3 })
      expect([...store.persisted.keys()]).to.deep.equal(['2026-10-11', '2026-10-12', '2026-10-13'])
    })

    it('keeps days already stored unless forced', async function () {
      const store = fakeStore({ existingDates: ['2026-10-12'] })
      const result = await backfillMergeMiningStats({ client: fakeClient(), days: 3, windowBlocks: 1000, now, store, log: silentLog })

      expect(result.persisted).to.equal(2)
      expect(result.skipped).to.equal(1)
      expect([...store.persisted.keys()]).to.deep.equal(['2026-10-11', '2026-10-13'])
    })

    it('recomputes every day when forced', async function () {
      const store = fakeStore({ existingDates: ['2026-10-12'] })
      const result = await backfillMergeMiningStats({ client: fakeClient(), days: 3, windowBlocks: 1000, now, store, force: true, log: silentLog })

      expect(result.persisted).to.equal(3)
      expect(result.skipped).to.equal(0)
    })

    it('skips a day with no blocks stored on or before it', async function () {
      const store = fakeStore({ heightForDay: endOfDay => (dayKey(endOfDay) === '2026-10-11' ? null : 1000) })
      const result = await backfillMergeMiningStats({ client: fakeClient(), days: 3, windowBlocks: 1000, now, store, log: silentLog })

      expect(result.persisted).to.equal(2)
      expect(result.skipped).to.equal(1)
      expect([...store.persisted.keys()]).to.deep.equal(['2026-10-12', '2026-10-13'])
    })

    it('continues past a day whose window is under the coverage floor', async function () {
      const store = fakeStore({
        heightForDay: endOfDay => ({ '2026-10-11': 5000, '2026-10-12': 6000, '2026-10-13': 7000 })[dayKey(endOfDay)],
        counts: (from, to) => (to === 6000 ? { total: 900, mergeMined: 500 } : { total: 1000, mergeMined: 600 })
      })
      const result = await backfillMergeMiningStats({ client: fakeClient(), days: 3, windowBlocks: 1000, now, store, log: silentLog })

      expect(result.persisted).to.equal(2)
      expect(result.failed).to.equal(1)
      expect([...store.persisted.keys()]).to.deep.equal(['2026-10-11', '2026-10-13'])
    })

    it('rejects an invalid day count', async function () {
      for (const days of [0, -1, 1.5]) {
        try {
          await backfillMergeMiningStats({ client: fakeClient(), days, now, store: fakeStore(), log: silentLog })
          throw new Error('should have thrown')
        } catch (error) {
          expect(error.message).to.contain('Invalid days')
        }
      }
    })

    it('requires a client', async function () {
      try {
        await backfillMergeMiningStats({ days: 3, now, store: fakeStore(), log: silentLog })
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('Missing Bitcoin client')
      }
    })
  })
})

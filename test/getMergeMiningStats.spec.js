import { expect } from 'chai'
import { getMergeMiningStats } from '../src/lib/getMergeMiningStats'

const silentLog = { info: () => {}, warn: () => {}, error: () => {} }

function storeWith ({ maxHeight, total, mergeMined }) {
  return {
    maxHeight: async () => maxHeight,
    countsInRange: async () => ({ total, mergeMined })
  }
}

function capturingWarnings () {
  const warnings = []
  return { warnings, info: () => {}, warn: message => warnings.push(message), error: () => {} }
}

const clientWith = hashrate => ({ getNetworkHashps: async () => hashrate })

function recordingClient (hashrate) {
  const calls = []
  return { calls, getNetworkHashps: async (...args) => { calls.push(args); return hashrate } }
}

describe('getMergeMiningStats', function () {
  it('computes the share and the secured hashrate over a complete window', async function () {
    const stats = await getMergeMiningStats({
      client: clientWith(1e21),
      windowBlocks: 1000,
      store: storeWith({ maxHeight: 961819, total: 1000, mergeMined: 622 }),
      log: silentLog
    })

    expect(stats.mergeMiningPercentage).to.equal('0.622000')
    expect(stats.bitcoinHashrate).to.equal('1000000000000000000000')
    expect(stats.rootstockSecuredHashrate).to.equal('622000000000000000000')
    expect(stats.bitcoinBlocks).to.equal(1000)
    expect(stats.mergeMinedBlocks).to.equal(622)
  })

  it('records the exact height range, so the published share can be audited', async function () {
    const stats = await getMergeMiningStats({
      client: clientWith(1e21),
      windowBlocks: 1000,
      store: storeWith({ maxHeight: 961819, total: 1000, mergeMined: 500 }),
      log: silentLog
    })

    expect(stats.fromHeight).to.equal(960820)
    expect(stats.toHeight).to.equal(961819)
    expect(stats.toHeight - stats.fromHeight + 1).to.equal(stats.bitcoinBlocks)
  })

  it('reads the hashrate over the same heights it counted, not over the ones at the node tip', async function () {
    const client = recordingClient(1e21)

    const stats = await getMergeMiningStats({
      client,
      windowBlocks: 1000,
      store: storeWith({ maxHeight: 961819, total: 1000, mergeMined: 622 }),
      log: silentLog
    })

    expect(client.calls).to.deep.equal([[1000, stats.toHeight]])
  })

  it('asks over the span it actually counted when the chain is shorter than the window', async function () {
    const client = recordingClient(1e21)

    const stats = await getMergeMiningStats({
      client,
      windowBlocks: 1000,
      store: storeWith({ maxHeight: 400, total: 401, mergeMined: 200 }),
      log: silentLog
    })

    expect(stats.fromHeight).to.equal(0)
    expect(stats.bitcoinBlocks).to.equal(401)
    expect(client.calls).to.deep.equal([[401, 400]])
  })

  it('reports a zero share without failing when no block carries the tag', async function () {
    const stats = await getMergeMiningStats({
      client: clientWith(4.14e12),
      windowBlocks: 100,
      store: storeWith({ maxHeight: 5105383, total: 100, mergeMined: 0 }),
      log: silentLog
    })

    expect(stats.mergeMiningPercentage).to.equal('0.000000')
    expect(stats.rootstockSecuredHashrate).to.equal('0')
    expect(stats.bitcoinHashrate).to.equal('4140000000000')
  })

  it('refuses to publish a window missing more heights than the coverage floor allows', async function () {
    try {
      await getMergeMiningStats({
        client: clientWith(1e21),
        windowBlocks: 1000,
        store: storeWith({ maxHeight: 961819, total: 979, mergeMined: 610 }),
        log: silentLog
      })
      throw new Error('should have thrown')
    } catch (error) {
      expect(error.message).to.contain('Incomplete window 960820-961819: 979/1000')
      expect(error.message).to.contain('under the 98%')
    }
  })

  it('publishes over the heights it has when the window is short but within the floor', async function () {
    const log = capturingWarnings()

    const stats = await getMergeMiningStats({
      client: clientWith(1e21),
      windowBlocks: 1000,
      store: storeWith({ maxHeight: 961819, total: 994, mergeMined: 621 }),
      log
    })

    expect(stats.bitcoinBlocks).to.equal(994)
    expect(stats.mergeMiningPercentage).to.equal('0.624748')
    expect(log.warnings).to.have.lengthOf(1)
    expect(log.warnings[0]).to.contain('missing 6 height(s)')
    expect(log.warnings[0]).to.contain('--from 960820 --to 961819')
  })

  it('says nothing about coverage when the window is whole', async function () {
    const log = capturingWarnings()

    await getMergeMiningStats({
      client: clientWith(1e21),
      windowBlocks: 1000,
      store: storeWith({ maxHeight: 961819, total: 1000, mergeMined: 622 }),
      log
    })

    expect(log.warnings).to.deep.equal([])
  })

  it('holds the floor at the exact boundary, so 98% publishes and a hair under refuses', async function () {
    const publishable = await getMergeMiningStats({
      client: clientWith(1e21),
      windowBlocks: 1000,
      store: storeWith({ maxHeight: 961819, total: 980, mergeMined: 600 }),
      log: capturingWarnings()
    })
    expect(publishable.bitcoinBlocks).to.equal(980)

    try {
      await getMergeMiningStats({
        client: clientWith(1e21),
        windowBlocks: 1000,
        store: storeWith({ maxHeight: 961819, total: 979, mergeMined: 600 }),
        log: silentLog
      })
      throw new Error('should have thrown')
    } catch (error) {
      expect(error.message).to.contain('Incomplete window')
    }
  })

  it('refuses to compute before any block has been ingested', async function () {
    try {
      await getMergeMiningStats({
        client: clientWith(1e21),
        store: storeWith({ maxHeight: null, total: 0, mergeMined: 0 }),
        log: silentLog
      })
      throw new Error('should have thrown')
    } catch (error) {
      expect(error.message).to.contain('No Bitcoin blocks ingested yet')
    }
  })

  it('rejects an invalid window', async function () {
    for (const windowBlocks of [0, -1, 1.5]) {
      try {
        await getMergeMiningStats({
          client: clientWith(1e21),
          windowBlocks,
          store: storeWith({ maxHeight: 100, total: 100, mergeMined: 1 }),
          log: silentLog
        })
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('Invalid windowBlocks')
      }
    }
  })

  it('requires a client for the hashrate', async function () {
    try {
      await getMergeMiningStats({ store: storeWith({ maxHeight: 100, total: 100, mergeMined: 1 }), log: silentLog })
      throw new Error('should have thrown')
    } catch (error) {
      expect(error.message).to.contain('Missing Bitcoin client')
    }
  })
})

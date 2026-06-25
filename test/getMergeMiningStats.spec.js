import { expect } from 'chai'
import { getMergeMiningStats } from '../src/lib/getMergeMiningStats'
import { RSK_TAG_HEX } from '../src/lib/rskMergeMiningTag'

const silentLog = { info () {}, warn () {}, error () {} }
const taggedCoinbase = { vin: [{ scriptsig: '03aa' }], vout: [{ scriptpubkey: `6a24${RSK_TAG_HEX}${'ab'.repeat(32)}` }] }
const plainCoinbase = { vin: [{ scriptsig: '03bb' }], vout: [{ scriptpubkey: '76a90088ac' }] }

// Heights in `taggedHeights` are merge-mined; heights in `failHeights` throw on fetch.
function fakeClient ({ tipHeight, taggedHeights = [], failHeights = [], hashrate = 900 }) {
  return {
    getTipHeight: async () => tipHeight,
    getBlockHash: async height => {
      if (failHeights.includes(height)) throw new Error(`boom ${height}`)
      return `hash-${height}`
    },
    getCoinbase: async hash => {
      const height = Number(hash.replace('hash-', ''))
      return taggedHeights.includes(height) ? taggedCoinbase : plainCoinbase
    },
    getNetworkHashrate: async () => hashrate,
    throttle: async () => {}
  }
}

describe('# getMergeMiningStats', function () {
  it('counts merge-mined blocks and derives the secured hashrate', async () => {
    const client = fakeClient({ tipHeight: 9, taggedHeights: [9, 7, 5], hashrate: 1000 })
    const stats = await getMergeMiningStats({ client, sampleSize: 10, log: silentLog })

    expect(stats.bitcoinBlocksSampled).to.equal(10)
    expect(stats.mergeMinedBlocks).to.equal(3)
    expect(stats.mergeMiningPercentage).to.equal('0.300000')
    expect(stats.bitcoinHashrate).to.equal('1000')
    expect(stats.rootstockSecuredHashrate).to.equal('300')
  })

  it('caps the window at the genesis block when the chain is shorter than the sample', async () => {
    const client = fakeClient({ tipHeight: 2, taggedHeights: [2] })
    const stats = await getMergeMiningStats({ client, sampleSize: 1000, log: silentLog })

    expect(stats.bitcoinBlocksSampled).to.equal(3)
    expect(stats.mergeMinedBlocks).to.equal(1)
  })

  it('skips unreachable blocks and computes the ratio over those actually sampled', async () => {
    const client = fakeClient({ tipHeight: 9, taggedHeights: [9, 8], failHeights: [7], hashrate: 1000 })
    const stats = await getMergeMiningStats({ client, sampleSize: 10, minCoverage: 0.5, log: silentLog })

    expect(stats.bitcoinBlocksSampled).to.equal(9)
    expect(stats.mergeMinedBlocks).to.equal(2)
    expect(stats.mergeMiningPercentage).to.equal('0.222222')
  })

  it('aborts rather than publish a ratio when block coverage is too low', async () => {
    const client = fakeClient({ tipHeight: 9, failHeights: [9, 8, 7, 6, 5] })
    let threw = false
    try {
      await getMergeMiningStats({ client, sampleSize: 10, minCoverage: 0.9, log: silentLog })
    } catch (error) {
      threw = true
    }
    expect(threw).to.equal(true)
  })

  it('rejects an invalid Bitcoin hashrate before walking blocks', async () => {
    const client = fakeClient({ tipHeight: 1, hashrate: 0 })
    let threw = false
    try {
      await getMergeMiningStats({ client, sampleSize: 2, log: silentLog })
    } catch (error) {
      threw = true
    }
    expect(threw).to.equal(true)
  })
})

/* global BigInt */
import { expect } from 'chai'
import { rawStatsToEntity, statsEntityToRaw, toIntegerString } from '../../src/converters/stats.converters'
import { getNetHashrate } from '../../src/lib/getBlockchainStats'

// 1234567890123456789012345 H/s (~1.23 ZH/s): above 1e21 and far above 2^53
const EXACT = '1234567890123456789012345'
const EXACT_HEX = '0x' + BigInt(EXACT).toString(16)

const rawStats = hashrate => ({
  activeAccounts: 1,
  hashrate,
  timestamp: 1,
  blockHash: '0xblock',
  blockNumber: 1,
  bridge: { lockingCap: '0x0' }
})

describe('stats.converters hashrate', () => {
  it('reads eth_netHashrate as raw hex and returns an exact integer string', async () => {
    const calls = []
    const fakeNode = { rpc: { sendMethod: async (method, params) => { calls.push([method, params]); return EXACT_HEX } } }
    const hashrate = await getNetHashrate(fakeNode)
    expect(calls).to.deep.equal([['eth_netHashrate', []]])
    expect(hashrate).to.equal(EXACT)
  })

  it('stores a >= 1e21 hashrate without exponent notation or precision loss', () => {
    const entity = rawStatsToEntity(rawStats(EXACT_HEX))
    expect(entity.hashrate).to.equal(EXACT)
    expect(entity.hashrate).to.not.match(/e/i)
    expect(BigInt(entity.hashrate)).to.equal(BigInt(EXACT))
    // the old String(Number) path would have produced exponent notation here
    expect(String(Number(EXACT))).to.match(/e\+/)
  })

  it('round-trips the stored value unchanged', () => {
    const raw = statsEntityToRaw(rawStatsToEntity(rawStats(EXACT_HEX)))
    expect(raw.hashrate).to.equal(EXACT)
  })

  it('handles exactly 1e21 and current-scale values', () => {
    expect(toIntegerString('0x3635c9adc5dea00000')).to.equal('1000000000000000000000')
    expect(toIntegerString(1e21)).to.equal('1000000000000000000000')
    expect(toIntegerString('614000000000000000001')).to.equal('614000000000000000001')
    expect(toIntegerString(BigInt('1000000000000000000000'))).to.equal('1000000000000000000000')
  })

  it('rejects non-integer input', () => {
    expect(() => toIntegerString('1e+21')).to.throw(/Invalid hashrate/)
    expect(() => toIntegerString(NaN)).to.throw(/Invalid hashrate/)
  })
})

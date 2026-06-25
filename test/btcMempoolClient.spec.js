import { expect } from 'chai'
import sinon from 'sinon'
import { createBtcMempoolClient } from '../src/lib/btcMempoolClient'

const silentLog = { info () {}, warn () {}, error () {} }
const ok = body => ({ ok: true, status: 200, json: async () => body, text: async () => String(body) })
const fail = status => ({ ok: false, status })
const client = () => createBtcMempoolClient({ retryDelayMs: 1, maxRetries: 2, log: silentLog })

describe('# btcMempoolClient', function () {
  afterEach(() => sinon.restore())

  it('retries on server errors and returns once the request succeeds', async () => {
    const fetch = sinon.stub()
    fetch.onCall(0).resolves(fail(503))
    fetch.onCall(1).resolves(ok('512345'))
    sinon.stub(global, 'fetch').callsFake(fetch)

    const height = await client().getTipHeight()
    expect(height).to.equal(512345)
    expect(fetch.callCount).to.equal(2)
  })

  it('fails fast on a non-retryable 4xx without exhausting retries', async () => {
    const fetch = sinon.stub(global, 'fetch').resolves(fail(404))

    let threw = false
    try {
      await client().getNetworkHashrate('1w')
    } catch (error) {
      threw = true
    }
    expect(threw).to.equal(true)
    expect(fetch.callCount).to.equal(1)
  })

  it('rejects a block hash that is not 64 hex chars', async () => {
    sinon.stub(global, 'fetch').resolves(ok('not-a-valid-hash'))

    let threw = false
    try {
      await client().getBlockHash(800000)
    } catch (error) {
      threw = true
    }
    expect(threw).to.equal(true)
  })

  it('returns the coinbase (first tx) of a block', async () => {
    const coinbase = { vin: [{ scriptsig: '03aa' }], vout: [] }
    sinon.stub(global, 'fetch').resolves(ok([coinbase]))

    const tx = await client().getCoinbase('a'.repeat(64))
    expect(tx).to.deep.equal(coinbase)
  })
})

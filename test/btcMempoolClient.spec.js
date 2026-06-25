import { expect } from 'chai'
import sinon from 'sinon'
import axios from 'axios'
import { createBtcMempoolClient } from '../src/lib/btcMempoolClient'

const silentLog = { info () {}, warn () {}, error () {} }
const httpError = status => {
  const error = new Error(`HTTP ${status}`)
  error.response = { status }
  return error
}
const client = () => createBtcMempoolClient({ retryDelayMs: 1, maxRetries: 2, log: silentLog })

describe('# btcMempoolClient', function () {
  afterEach(() => sinon.restore())

  it('retries on server errors and returns once the request succeeds', async () => {
    const get = sinon.stub(axios, 'get')
    get.onCall(0).rejects(httpError(503))
    get.onCall(1).resolves({ data: 512345 })

    const height = await client().getTipHeight()
    expect(height).to.equal(512345)
    expect(get.callCount).to.equal(2)
  })

  it('fails fast on a non-retryable 4xx without exhausting retries', async () => {
    const get = sinon.stub(axios, 'get').rejects(httpError(404))

    let threw = false
    try {
      await client().getNetworkHashrate('1w')
    } catch (error) {
      threw = true
    }
    expect(threw).to.equal(true)
    expect(get.callCount).to.equal(1)
  })

  it('rejects a block hash that is not 64 hex chars', async () => {
    sinon.stub(axios, 'get').resolves({ data: 'not-a-valid-hash' })

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
    sinon.stub(axios, 'get').resolves({ data: [coinbase] })

    const tx = await client().getCoinbase('a'.repeat(64))
    expect(tx).to.deep.equal(coinbase)
  })
})

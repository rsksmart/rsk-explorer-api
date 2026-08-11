import { expect } from 'chai'
import { createBtcRpcClient } from '../src/lib/btcRpcClient'

const silentLog = { info: () => {}, warn: () => {}, error: () => {} }
const URL_WITH_CREDENTIAL = 'https://bitcoin-mainnet.example.com/v2/super-secret-api-key'
const BLOCK_HASH = '000000000000000000004cfd1f9cb5463a597662fa3cf15d5c8218fbfd6fbdcb'

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
})

function stubFetch (responses) {
  const calls = []
  global.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) })
    const next = responses.shift()
    if (typeof next === 'function') return next()
    return next
  }
  return calls
}

describe('btcRpcClient', function () {
  const originalFetch = global.fetch
  afterEach(function () { global.fetch = originalFetch })

  describe('configuration', function () {
    it('rejects a non-URL endpoint', function () {
      expect(() => createBtcRpcClient({ url: 'not a url' })).to.throw(/not a valid URL/)
    })

    it('rejects a non-HTTP protocol', function () {
      expect(() => createBtcRpcClient({ url: 'ftp://node.example.com' })).to.throw(/unsupported protocol/)
    })
  })

  describe('credential handling', function () {
    it('never exposes the credential through the public endpoint label', function () {
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, log: silentLog })
      expect(client.endpoint).to.equal('https://bitcoin-mainnet.example.com')
      expect(client.endpoint).to.not.contain('super-secret-api-key')
    })

    it('keeps the credential out of a transport failure, however the runtime words it', async function () {
      // Worst case: the fetch implementation puts the whole URL in the error it throws
      global.fetch = async () => {
        const cause = new Error(`getaddrinfo ENOTFOUND for ${URL_WITH_CREDENTIAL}`)
        const error = new TypeError(`fetch failed: ${URL_WITH_CREDENTIAL}`)
        error.cause = cause
        throw error
      }
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, maxRetries: 0, log: silentLog })

      try {
        await client.getBlockCount()
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.not.contain('super-secret-api-key')
        expect(error.stack).to.not.contain('super-secret-api-key')
        expect(error.cause).to.equal(undefined)
        // Still says what went wrong, and against which host
        expect(error.message).to.contain('could not reach https://bitcoin-mainnet.example.com')
        expect(error.message).to.contain('ENOTFOUND')
      }
    })

    it('still retries a transport failure after sanitising it', async function () {
      let calls = 0
      global.fetch = async () => {
        calls++
        if (calls === 1) throw new TypeError(`fetch failed: ${URL_WITH_CREDENTIAL}`)
        return jsonResponse({ result: 961919 })
      }
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, retryDelayMs: 1, log: silentLog })

      expect(await client.getBlockCount()).to.equal(961919)
      expect(calls).to.equal(2)
    })

    it('keeps the credential out of retry warnings', async function () {
      const warnings = []
      const log = { ...silentLog, warn: message => warnings.push(message) }
      stubFetch([jsonResponse({}, 503), jsonResponse({ result: 961919 })])

      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, retryDelayMs: 1, log })
      await client.getBlockCount()

      expect(warnings).to.have.lengthOf(1)
      expect(warnings[0]).to.not.contain('super-secret-api-key')
    })
  })

  describe('retry policy', function () {
    it('retries a 5xx and then succeeds', async function () {
      const calls = stubFetch([jsonResponse({}, 500), jsonResponse({ result: 961919 })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, retryDelayMs: 1, log: silentLog })

      expect(await client.getBlockCount()).to.equal(961919)
      expect(calls).to.have.lengthOf(2)
    })

    it('retries a 429', async function () {
      const calls = stubFetch([jsonResponse({}, 429), jsonResponse({ result: 5 })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, retryDelayMs: 1, log: silentLog })

      await client.getBlockCount()
      expect(calls).to.have.lengthOf(2)
    })

    it('does not retry a 4xx that is not a 429', async function () {
      const calls = stubFetch([jsonResponse({}, 401), jsonResponse({ result: 5 })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, retryDelayMs: 1, log: silentLog })

      try {
        await client.getBlockCount()
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('HTTP 401')
      }
      expect(calls).to.have.lengthOf(1)
    })

    it('does not retry a method the node rejects', async function () {
      const calls = stubFetch([jsonResponse({ error: { code: -32600, message: 'Unsupported method' } })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, retryDelayMs: 1, log: silentLog })

      try {
        await client.getNetworkHashps()
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('Unsupported method')
      }
      expect(calls).to.have.lengthOf(1)
    })

    it('gives up after maxRetries', async function () {
      const calls = stubFetch([
        jsonResponse({}, 500), jsonResponse({}, 500), jsonResponse({}, 500)
      ])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, maxRetries: 2, retryDelayMs: 1, log: silentLog })

      try {
        await client.getBlockCount()
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('HTTP 500')
      }
      expect(calls).to.have.lengthOf(3)
    })
  })

  describe('response validation', function () {
    it('rejects a block hash that is not 32 bytes of hex', async function () {
      stubFetch([jsonResponse({ result: 'nope' })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, log: silentLog })

      try {
        await client.getBlockHash(900000)
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('expected a 32-byte hash')
      }
    })

    it('rejects a non-integer block count', async function () {
      stubFetch([jsonResponse({ result: 'many' })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, log: silentLog })

      try {
        await client.getBlockCount()
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('expected an integer')
      }
    })

    it('rejects a block that lists no transactions', async function () {
      stubFetch([jsonResponse({ result: { height: 1, hash: BLOCK_HASH, time: 1, tx: [] } })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, log: silentLog })

      try {
        await client.getBlock(BLOCK_HASH)
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('no transactions listed')
      }
    })

    it('rejects an implausible hashrate', async function () {
      stubFetch([jsonResponse({ result: 0 })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, log: silentLog })

      try {
        await client.getNetworkHashps(1008)
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('implausible value')
      }
    })

    it('returns the fields the ingest needs from a block', async function () {
      stubFetch([jsonResponse({
        result: { height: 955501, hash: BLOCK_HASH, time: 1782484418, difficulty: 124932866006548.2, tx: [BLOCK_HASH] }
      })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, log: silentLog })

      const block = await client.getBlock(BLOCK_HASH)
      expect(block).to.deep.equal({
        height: 955501,
        hash: BLOCK_HASH,
        time: 1782484418,
        difficulty: 124932866006548.2,
        coinbaseTxid: BLOCK_HASH
      })
    })
  })

  describe('rate limiting and backpressure', function () {
    it('paces sustained requests at the configured rate', async function () {
      // Concurrency is not a rate: without pacing these ten calls would all leave at once
      stubFetch(Array.from({ length: 10 }, () => jsonResponse({ result: 1 })))
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, requestsPerSecond: 50, log: silentLog })

      const started = Date.now()
      await Promise.all(Array.from({ length: 10 }, () => client.getBlockCount()))
      const elapsed = Date.now() - started

      // Ten requests at 50/s cannot complete faster than the nine intervals between them
      expect(elapsed).to.be.at.least(9 * 20 * 0.8)
    })

    it('does not pace when the rate limit is disabled, as for a self-hosted node', async function () {
      stubFetch(Array.from({ length: 10 }, () => jsonResponse({ result: 1 })))
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, requestsPerSecond: 0, log: silentLog })

      const started = Date.now()
      await Promise.all(Array.from({ length: 10 }, () => client.getBlockCount()))
      expect(Date.now() - started).to.be.below(100)
    })

    it('waits the interval the provider asks for on a 429', async function () {
      const throttled = {
        ok: false,
        status: 429,
        headers: new Map([['retry-after', '1']]),
        json: async () => ({})
      }
      throttled.headers.get = key => new Map([['retry-after', '1']]).get(key)
      stubFetch([throttled, jsonResponse({ result: 7 })])

      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, retryDelayMs: 1, log: silentLog })
      const started = Date.now()
      expect(await client.getBlockCount()).to.equal(7)
      expect(Date.now() - started).to.be.at.least(900)
    })

    it('counts throttling so a long job can report it as a number', async function () {
      stubFetch([jsonResponse({}, 429), jsonResponse({}, 429), jsonResponse({ result: 1 })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, retryDelayMs: 1, log: silentLog })

      await client.getBlockCount()

      const stats = client.stats()
      expect(stats.requests).to.equal(3)
      expect(stats.throttled).to.equal(2)
      expect(stats.retries).to.equal(2)
    })
  })

  describe('request shape', function () {
    it('sends method and params in the body, never in the path', async function () {
      const calls = stubFetch([jsonResponse({ result: BLOCK_HASH })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, log: silentLog })

      await client.getBlockHash(900000)

      expect(calls[0].url).to.equal(URL_WITH_CREDENTIAL)
      expect(calls[0].body.method).to.equal('getblockhash')
      expect(calls[0].body.params).to.deep.equal([900000])
    })
  })
})

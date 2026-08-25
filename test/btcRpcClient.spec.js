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
    it('rejects a block hash that is not 32 bytes of hex, without retrying it', async function () {
      const calls = stubFetch([jsonResponse({ result: 'nope' })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, maxRetries: 3, retryDelayMs: 1, log: silentLog })

      try {
        await client.getBlockHash(900000)
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('expected a 32-byte hash')
      }
      expect(calls).to.have.lengthOf(1)
    })

    it('rejects a non-integer block count, without retrying it', async function () {
      const calls = stubFetch([jsonResponse({ result: 'many' })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, maxRetries: 3, retryDelayMs: 1, log: silentLog })

      try {
        await client.getBlockCount()
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('expected an integer')
      }
      expect(calls).to.have.lengthOf(1)
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

    it('anchors the hashrate estimate at the height it is given', async function () {
      const calls = stubFetch([jsonResponse({ result: 8.94e20 })])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, log: silentLog })

      await client.getNetworkHashps(1000, 961819)
      expect(calls[0].body.params).to.deep.equal([1000, 961819])
    })

    it('refuses a height without a block count, because positional params cannot skip one', async function () {
      stubFetch([])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, log: silentLog })

      try {
        await client.getNetworkHashps(undefined, 961819)
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('needs an explicit block count')
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

  describe('portability', function () {
    it('only ever calls methods Bitcoin Core itself exposes', async function () {
      const STANDARD = ['getblockcount', 'getblockhash', 'getblock', 'getrawtransaction', 'getnetworkhashps']
      const calls = stubFetch([
        jsonResponse({ result: 961919 }),
        jsonResponse({ result: BLOCK_HASH }),
        jsonResponse({ result: { height: 1, hash: BLOCK_HASH, time: 1, tx: [BLOCK_HASH] } }),
        jsonResponse({ result: { vin: [], vout: [] } }),
        jsonResponse({ result: 8.88e20 })
      ])
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, log: silentLog })

      await client.getBlockCount()
      await client.getBlockHash(900000)
      await client.getBlock(BLOCK_HASH)
      await client.getCoinbase(BLOCK_HASH, BLOCK_HASH)
      await client.getNetworkHashps(1008)

      expect(calls.map(c => c.body.method)).to.deep.equal(STANDARD)
    })
  })

  describe('transport failure rendering', function () {
    it('renders no empty parenthetical when the cause carries no message', async function () {
      global.fetch = async () => {
        const error = new TypeError('fetch failed')
        error.cause = new AggregateError([], '')
        throw error
      }
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, maxRetries: 0, log: silentLog })

      try {
        await client.getBlockCount()
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('TypeError: fetch failed')
        expect(error.message).to.not.contain('()')
        expect(error.message).to.not.match(/\(\s*\)/)
      }
    })
  })

  describe('rate limiting and backpressure', function () {
    it('paces sustained requests at the configured rate', async function () {
      stubFetch(Array.from({ length: 10 }, () => jsonResponse({ result: 1 })))
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, sustainedRequestsPerSecond: 50, log: silentLog })

      const started = Date.now()
      await Promise.all(Array.from({ length: 10 }, () => client.getBlockCount()))
      const elapsed = Date.now() - started

      expect(elapsed).to.be.at.least(9 * 20 * 0.8)
    })

    it('does not pace when the rate limit is disabled, as for a self-hosted node', async function () {
      stubFetch(Array.from({ length: 10 }, () => jsonResponse({ result: 1 })))
      const client = createBtcRpcClient({ url: URL_WITH_CREDENTIAL, sustainedRequestsPerSecond: 0, log: silentLog })

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

      const stats = client.totals()
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

  describe('failover across endpoints', function () {
    const URL_A = 'https://node-a.example.com/v2/secret-key-aaa'
    const URL_B = 'https://node-b.example.com/v2/secret-key-bbb'

    function stubFetchByUrl (handlers) {
      const calls = []
      global.fetch = async (url, options) => {
        calls.push({ url, body: JSON.parse(options.body) })
        const handler = handlers[url]
        if (!handler) throw new Error(`no stub configured for ${url}`)
        return handler()
      }
      return calls
    }

    const transportThrow = url => () => { throw new TypeError(`fetch failed: ${url}`) }

    it('fails over to the secondary when the primary is down', async function () {
      const calls = stubFetchByUrl({
        [URL_A]: transportThrow(URL_A),
        [URL_B]: () => jsonResponse({ result: 961919 })
      })
      const client = createBtcRpcClient({ url: [URL_A, URL_B], retryDelayMs: 1, log: silentLog })

      expect(await client.getBlockCount()).to.equal(961919)
      expect(calls.map(c => c.url)).to.deep.equal([URL_A, URL_B])
    })

    it('throws after trying every endpoint when all are down', async function () {
      const calls = stubFetchByUrl({
        [URL_A]: transportThrow(URL_A),
        [URL_B]: transportThrow(URL_B)
      })
      const client = createBtcRpcClient({ url: [URL_A, URL_B], maxRetries: 3, retryDelayMs: 1, log: silentLog })

      try {
        await client.getBlockCount()
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('could not reach')
      }
      const tried = new Set(calls.map(c => c.url))
      expect(tried.has(URL_A)).to.equal(true)
      expect(tried.has(URL_B)).to.equal(true)
    })

    it('does not keep failing over once an endpoint returns a JSON-RPC error', async function () {
      let bCalls = 0
      const calls = stubFetchByUrl({
        [URL_A]: transportThrow(URL_A),
        [URL_B]: () => { bCalls++; return jsonResponse({ error: { code: -32601, message: 'Method not found' } }) }
      })
      const client = createBtcRpcClient({ url: [URL_A, URL_B], maxRetries: 5, retryDelayMs: 1, log: silentLog })

      try {
        await client.getNetworkHashps()
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.contain('Method not found')
      }
      expect(bCalls).to.equal(1)
      expect(calls.map(c => c.url)).to.deep.equal([URL_A, URL_B])
    })

    it('sticks to the endpoint that served, so a dead primary is paid for once, not per call', async function () {
      const calls = stubFetchByUrl({
        [URL_A]: transportThrow(URL_A),
        [URL_B]: () => jsonResponse({ result: 7 })
      })
      const client = createBtcRpcClient({ url: [URL_A, URL_B], retryDelayMs: 1, log: silentLog })

      await client.getBlockCount()
      await client.getBlockCount()

      expect(calls.filter(c => c.url === URL_A)).to.have.lengthOf(1)
      expect(calls.filter(c => c.url === URL_B)).to.have.lengthOf(2)
    })

    it('strips every configured URL from a thrown message, not just the primary', async function () {
      global.fetch = async (url) => {
        const cause = new Error(`getaddrinfo ENOTFOUND for ${url}`)
        const error = new TypeError(`fetch failed: ${url}`)
        error.cause = cause
        throw error
      }
      const client = createBtcRpcClient({ url: [URL_A, URL_B], maxRetries: 1, retryDelayMs: 1, log: silentLog })

      try {
        await client.getBlockCount()
        throw new Error('should have thrown')
      } catch (error) {
        expect(error.message).to.not.contain('secret-key-aaa')
        expect(error.message).to.not.contain('secret-key-bbb')
        expect(error.message).to.contain('could not reach https://node-b.example.com')
      }
    })

    it('reports the current endpoint through the public label', function () {
      const client = createBtcRpcClient({ url: [URL_A, URL_B], log: silentLog })
      expect(client.endpoint).to.equal('https://node-a.example.com')
    })

    it('requires at least one endpoint', function () {
      expect(() => createBtcRpcClient({ url: [] })).to.throw(/at least one endpoint/)
    })
  })
})

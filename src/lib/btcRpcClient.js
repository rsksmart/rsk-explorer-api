import Logger from './Logger'

const DEFAULTS = {
  url: 'http://localhost:8332',
  requestTimeoutMs: 15000,
  maxRetries: 5,
  retryDelayMs: 1000,
  requestsPerSecond: 25
}

const HASH_64 = /^[0-9a-f]{64}$/i

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Paces every request the client makes, whatever the caller's concurrency. Without this,
// in-flight count is the only brake, which is not a rate: providers absorb a few seconds
// of excess from burst capacity and then throttle hard, so a short benchmark measures a
// throughput the same code cannot sustain for minutes. Set to 0 to disable, which is
// appropriate for a self-hosted node.
function createRateLimiter (requestsPerSecond) {
  if (!requestsPerSecond || requestsPerSecond <= 0) return async () => {}

  const intervalMs = 1000 / requestsPerSecond
  let nextSlot = 0

  return async () => {
    const now = Date.now()
    const slot = Math.max(now, nextSlot)
    nextSlot = slot + intervalMs
    if (slot > now) await sleep(slot - now)
  }
}

function retryAfterMs (response) {
  const header = response.headers && response.headers.get && response.headers.get('retry-after')
  const seconds = Number(header)
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null
}

// Full jitter, so callers throttled in the same instant do not retry in the same instant
function backoffMs (attempt, baseMs) {
  return Math.random() * baseMs * Math.pow(2, attempt)
}

// Providers commonly carry the credential inside the URL, so the URL itself is a
// secret and must never reach a log line, an error message or a stack trace.
function redactUrl (url) {
  try {
    const { protocol, host } = new URL(url)
    return `${protocol}//${host}`
  } catch (error) {
    return '[unparseable url]'
  }
}

function normalizeUrl (raw) {
  let parsed
  try {
    parsed = new URL(raw)
  } catch (error) {
    throw new Error('Invalid bitcoin.rpcUrl: not a valid URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Invalid bitcoin.rpcUrl: unsupported protocol '${parsed.protocol}'`)
  }
  return parsed.toString().replace(/\/+$/, '')
}

function asInteger (value, label) {
  const number = Number(value)
  if (!Number.isInteger(number)) throw new Error(`${label}: expected an integer, got ${JSON.stringify(value)}`)
  return number
}

function asBlockHash (value, label) {
  if (typeof value !== 'string' || !HASH_64.test(value)) {
    throw new Error(`${label}: expected a 32-byte hash, got ${JSON.stringify(value)}`)
  }
  return value.toLowerCase()
}

// Read-only client for the Bitcoin JSON-RPC interface, using only methods Bitcoin
// Core itself exposes so a deployment can point at its own node, or any compatible
// provider, by changing one URL. Method and arguments travel in the request body,
// which is why nothing here interpolates a value into a path.
//
// The provider is treated as untrusted: every response is shape-checked before it
// reaches a caller, requests are bounded by a timeout, and only transport failures
// and provider-side faults are retried.
export function createBtcRpcClient (options = {}) {
  const cfg = { ...DEFAULTS, ...options }
  const url = normalizeUrl(cfg.url)
  const endpoint = redactUrl(url)
  const log = cfg.log || Logger('[btc-rpc-client]')
  const acquireSlot = createRateLimiter(cfg.requestsPerSecond)
  const counters = { requests: 0, throttled: 0, retries: 0 }
  let nextId = 1

  // Transport errors are re-raised as our own, carrying the failure reason but never the
  // request URL. Node's fetch does not put the URL in the errors it throws today, so this
  // makes the property an invariant of this module rather than of that implementation.
  const withoutUrl = text => (typeof text === 'string' ? text.split(url).join(endpoint) : '')

  function transportError (method, cause) {
    const reason = withoutUrl(`${cause.name}: ${cause.message}`)
    // Node wraps a failed connection in an AggregateError whose own message is empty, so an
    // inner clause is only added when it actually says something
    const detail = cause.cause && cause.cause.message ? withoutUrl(`${cause.cause.name}: ${cause.cause.message}`) : ''
    // No verdict set, so the retry policy treats it as worth another attempt
    return new Error(`${method} could not reach ${endpoint} — ${reason}${detail ? ` (${detail})` : ''}`)
  }

  async function callOnce (method, params) {
    await acquireSlot()
    counters.requests++

    let response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
        signal: AbortSignal.timeout(cfg.requestTimeoutMs)
      })
    } catch (cause) {
      throw transportError(method, cause)
    }

    if (!response.ok) {
      const error = new Error(`${method} failed with HTTP ${response.status}`)
      error.retryable = response.status === 429 || response.status >= 500
      if (response.status === 429) {
        counters.throttled++
        error.throttled = true
        error.retryAfterMs = retryAfterMs(response)
      }
      throw error
    }

    const body = await response.json()
    if (body && body.error) {
      // A rejected method or a malformed request fails identically on every attempt
      const error = new Error(`${method} rejected by node: ${body.error.message || 'unknown error'} (${body.error.code})`)
      error.retryable = false
      throw error
    }
    if (!body || body.result === undefined) throw new Error(`${method}: response carried no result`)

    return body.result
  }

  async function call (method, params = []) {
    let lastError
    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      try {
        return await callOnce(method, params)
      } catch (error) {
        lastError = error
        // Transport failures arrive without a verdict of their own and are worth another try
        if (error.retryable === false || attempt === cfg.maxRetries) break

        const delay = error.retryAfterMs || backoffMs(attempt, cfg.retryDelayMs)
        counters.retries++
        const note = `${method} on ${endpoint} failed (${error.message}); retry ${attempt + 1}/${cfg.maxRetries} in ${Math.round(delay)} ms`
        // Throttling is expected backpressure and would otherwise flood the log one line per
        // request; stats() carries the running totals instead. Anything else is worth a warning.
        if (!error.throttled) log.warn(note)
        else if (log.debug) log.debug(note)
        await sleep(delay)
      }
    }
    throw lastError
  }

  return {
    endpoint,

    // Running totals, so a long job can report throttling as a number instead of a log flood
    stats: () => ({ ...counters }),

    getBlockCount: async () => asInteger(await call('getblockcount'), 'getblockcount'),

    getBlockHash: async height =>
      asBlockHash(await call('getblockhash', [asInteger(height, 'getblockhash height')]), `getblockhash(${height})`),

    getBlock: async hash => {
      const block = await call('getblock', [asBlockHash(hash, 'getblock hash'), 1])
      if (!block || typeof block !== 'object') throw new Error(`getblock(${hash}): response was not an object`)
      if (!Array.isArray(block.tx) || block.tx.length === 0) throw new Error(`getblock(${hash}): no transactions listed`)
      return {
        height: asInteger(block.height, `getblock(${hash}) height`),
        hash: asBlockHash(block.hash, `getblock(${hash}) hash`),
        time: asInteger(block.time, `getblock(${hash}) time`),
        // Bitcoin reports difficulty as a float, so it is carried as-is and stored as a decimal
        difficulty: Number.isFinite(Number(block.difficulty)) ? Number(block.difficulty) : null,
        coinbaseTxid: asBlockHash(block.tx[0], `getblock(${hash}) tx[0]`)
      }
    },

    // The block hash is passed so the lookup does not require a transaction index,
    // which keeps this working against a default Bitcoin Core configuration.
    getCoinbase: async (txid, blockHash) => {
      const coinbase = await call('getrawtransaction', [
        asBlockHash(txid, 'getrawtransaction txid'),
        true,
        asBlockHash(blockHash, 'getrawtransaction blockhash')
      ])
      if (!coinbase || typeof coinbase !== 'object') throw new Error(`getrawtransaction(${txid}): response was not an object`)
      return coinbase
    },

    // Standard estimate of network hash power. Returned as a JSON number, so digits
    // beyond a double's precision are not meaningful — which is true of the estimate too.
    getNetworkHashps: async blocks => {
      const params = blocks === undefined ? [] : [asInteger(blocks, 'getnetworkhashps blocks')]
      const hashrate = Number(await call('getnetworkhashps', params))
      if (!Number.isFinite(hashrate) || hashrate <= 0) throw new Error(`getnetworkhashps: implausible value ${hashrate}`)
      return hashrate
    }
  }
}

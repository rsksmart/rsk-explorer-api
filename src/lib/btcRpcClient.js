import Logger from './Logger'

const DEFAULTS = {
  url: 'http://localhost:8332',
  requestTimeoutMs: 15000,
  maxRetries: 5,
  retryDelayMs: 1000,
  sustainedRequestsPerSecond: 25
}

const HASH_64 = /^[0-9a-f]{64}$/i

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function createRateLimiter (sustainedRequestsPerSecond) {
  if (!sustainedRequestsPerSecond || sustainedRequestsPerSecond <= 0) return async () => {}

  const intervalMs = 1000 / sustainedRequestsPerSecond
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

function fullJitterBackoffMs (attempt, baseMs) {
  return Math.random() * baseMs * Math.pow(2, attempt)
}

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

function deterministicFailure (message) {
  const error = new Error(message)
  error.retryable = false
  return error
}

function asInteger (value, label) {
  const number = Number(value)
  if (!Number.isInteger(number)) throw deterministicFailure(`${label}: expected an integer, got ${JSON.stringify(value)}`)
  return number
}

function asBlockHash (value, label) {
  if (typeof value !== 'string' || !HASH_64.test(value)) {
    throw deterministicFailure(`${label}: expected a 32-byte hash, got ${JSON.stringify(value)}`)
  }
  return value.toLowerCase()
}

export function createBtcRpcClient (options = {}) {
  const cfg = { ...DEFAULTS, ...options }
  const url = normalizeUrl(cfg.url)
  const endpoint = redactUrl(url)
  const log = cfg.log || Logger('[btc-rpc-client]')
  const acquireSlot = createRateLimiter(cfg.sustainedRequestsPerSecond)
  const totals = { requests: 0, throttled: 0, retries: 0 }
  let nextId = 1

  const withoutUrl = text => (typeof text === 'string' ? text.split(url).join(endpoint) : '')

  function transportFailure (method, cause) {
    const reason = withoutUrl(`${cause.name}: ${cause.message}`)
    const innerIfItSaysAnything = cause.cause && cause.cause.message ? withoutUrl(`${cause.cause.name}: ${cause.cause.message}`) : ''
    const error = new Error(`${method} could not reach ${endpoint} — ${reason}${innerIfItSaysAnything ? ` (${innerIfItSaysAnything})` : ''}`)
    error.retryable = true
    return error
  }

  async function callOnce (method, params) {
    await acquireSlot()
    totals.requests++

    let response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
        signal: AbortSignal.timeout(cfg.requestTimeoutMs)
      })
    } catch (cause) {
      throw transportFailure(method, cause)
    }

    if (!response.ok) {
      const error = new Error(`${method} failed with HTTP ${response.status}`)
      error.retryable = response.status === 429 || response.status >= 500
      if (response.status === 429) {
        totals.throttled++
        error.throttled = true
        error.retryAfterMs = retryAfterMs(response)
      }
      throw error
    }

    const body = await response.json()
    if (body && body.error) {
      throw deterministicFailure(`${method} rejected by node: ${body.error.message || 'unknown error'} (${body.error.code})`)
    }
    if (!body || body.result === undefined) throw deterministicFailure(`${method}: response carried no result`)

    return body.result
  }

  async function call (method, params = []) {
    let lastError
    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      try {
        return await callOnce(method, params)
      } catch (error) {
        lastError = error
        if (!error.retryable || attempt === cfg.maxRetries) break

        const delay = error.retryAfterMs || fullJitterBackoffMs(attempt, cfg.retryDelayMs)
        totals.retries++
        const note = `${method} on ${endpoint} failed (${error.message}); retry ${attempt + 1}/${cfg.maxRetries} in ${Math.round(delay)} ms`
        if (!error.throttled) log.warn(note)
        else if (log.debug) log.debug(note)
        await sleep(delay)
      }
    }
    throw lastError
  }

  return {
    endpoint,

    totals: () => ({ ...totals }),

    getBlockCount: async () => asInteger(await call('getblockcount'), 'getblockcount'),

    getBlockHash: async height =>
      asBlockHash(await call('getblockhash', [asInteger(height, 'getblockhash height')]), `getblockhash(${height})`),

    getBlock: async hash => {
      const block = await call('getblock', [asBlockHash(hash, 'getblock hash'), 1])
      if (!block || typeof block !== 'object') throw deterministicFailure(`getblock(${hash}): response was not an object`)
      if (!Array.isArray(block.tx) || block.tx.length === 0) throw deterministicFailure(`getblock(${hash}): no transactions listed`)
      return {
        height: asInteger(block.height, `getblock(${hash}) height`),
        hash: asBlockHash(block.hash, `getblock(${hash}) hash`),
        time: asInteger(block.time, `getblock(${hash}) time`),
        difficulty: Number.isFinite(Number(block.difficulty)) ? Number(block.difficulty) : null,
        coinbaseTxid: asBlockHash(block.tx[0], `getblock(${hash}) tx[0]`)
      }
    },

    getCoinbase: async (txid, blockHash) => {
      const coinbase = await call('getrawtransaction', [
        asBlockHash(txid, 'getrawtransaction txid'),
        true,
        asBlockHash(blockHash, 'getrawtransaction blockhash')
      ])
      if (!coinbase || typeof coinbase !== 'object') throw deterministicFailure(`getrawtransaction(${txid}): response was not an object`)
      return coinbase
    },

    getNetworkHashps: async blocks => {
      const params = blocks === undefined ? [] : [asInteger(blocks, 'getnetworkhashps blocks')]
      const hashrate = Number(await call('getnetworkhashps', params))
      if (!Number.isFinite(hashrate) || hashrate <= 0) {
        throw deterministicFailure(`getnetworkhashps: implausible value ${hashrate}`)
      }
      return hashrate
    }
  }
}

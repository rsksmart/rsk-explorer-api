import Logger from './Logger'

const DEFAULTS = {
  baseUrl: 'https://mempool.space/api',
  requestDelayMs: 250,
  requestTimeoutMs: 15000,
  maxRetries: 3,
  retryDelayMs: 1000
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Reads-only client for the mempool.space REST API (Esplora-compatible),
// treating the provider as untrusted: bounded timeout, retries on throttling
// and server errors only, and a throttle between calls.
export function createBtcMempoolClient (options = {}) {
  const cfg = { ...DEFAULTS, ...options }
  const baseUrl = cfg.baseUrl.replace(/\/+$/, '')
  const log = cfg.log || Logger('[btc-mempool-client]')

  async function fetchOnce (path, json) {
    const controller = new global.AbortController()
    const timer = setTimeout(() => controller.abort(), cfg.requestTimeoutMs)
    try {
      const res = await global.fetch(`${baseUrl}${path}`, { signal: controller.signal })
      if (res.ok) return json ? res.json() : res.text()
      const error = new Error(`HTTP ${res.status} for ${path}`)
      error.retryable = res.status === 429 || res.status >= 500
      throw error
    } catch (error) {
      if (error.retryable === undefined) error.retryable = true
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  async function request (path, { json = true } = {}) {
    let lastError
    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      try {
        return await fetchOnce(path, json)
      } catch (error) {
        lastError = error
        if (!error.retryable || attempt === cfg.maxRetries) break
        const backoff = cfg.retryDelayMs * (attempt + 1)
        log.warn(`Request to ${path} failed (${error.message}); retry ${attempt + 1}/${cfg.maxRetries} in ${backoff} ms`)
        await sleep(backoff)
      }
    }
    throw lastError
  }

  return {
    getTipHeight: async () => Number(await request('/blocks/tip/height', { json: false })),
    getBlockHash: async height => {
      const hash = (await request(`/block-height/${height}`, { json: false })).trim()
      // Validated before being interpolated into later request paths
      if (!/^[0-9a-f]{64}$/i.test(hash)) throw new Error(`Invalid block hash for height ${height}`)
      return hash
    },
    getCoinbase: async blockHash => {
      const txs = await request(`/block/${blockHash}/txs/0`)
      return Array.isArray(txs) ? txs[0] : null
    },
    getNetworkHashrate: async (period = '1w') => {
      const { currentHashrate } = await request(`/v1/mining/hashrate/${period}`)
      return currentHashrate
    },
    throttle: () => sleep(cfg.requestDelayMs)
  }
}

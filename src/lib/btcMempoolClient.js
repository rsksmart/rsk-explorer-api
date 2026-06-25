import axios from 'axios'
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
// and server errors only, and a throttle between calls. Uses axios rather than
// global fetch so it runs on the Node 16 deploy runtime.
export function createBtcMempoolClient (options = {}) {
  const cfg = { ...DEFAULTS, ...options }
  const baseUrl = cfg.baseUrl.replace(/\/+$/, '')
  const log = cfg.log || Logger('[btc-mempool-client]')

  async function fetchOnce (path) {
    try {
      const { data } = await axios.get(`${baseUrl}${path}`, { timeout: cfg.requestTimeoutMs })
      return data
    } catch (error) {
      const status = error.response && error.response.status
      // Network/timeout errors and 429/5xx are worth retrying; other 4xx are not
      error.retryable = !status || status === 429 || status >= 500
      throw error
    }
  }

  async function request (path) {
    let lastError
    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      try {
        return await fetchOnce(path)
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
    getTipHeight: async () => Number(await request('/blocks/tip/height')),
    getBlockHash: async height => {
      const hash = String(await request(`/block-height/${height}`)).trim()
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

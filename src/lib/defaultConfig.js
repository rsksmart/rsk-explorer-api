/**
 *  This file provides default values,
 *  use /config.json, to overwrite settings
 */
import dotenv from 'dotenv'
import { MODULES } from './types'
import delayedFields from './delayedFields'

dotenv.config()

export const EXPLORER_INITIAL_CONFIG_ID = 'explorerInitialConfig'
export const EXPLORER_SETTINGS_ID = 'explorerSettings'
export const CONTRACT_VERIFIER_SOLC_VERSIONS_ID = 'contractVerifierSolcVersions'

export const enabledServices = {
  LIVE_SYNCER: 'liveSyncer',
  STATIC_SYNCER: 'staticSyncer',
  TX_POOL: 'txPool'
}

const services = Object.assign({}, enabledServices)
for (let s in services) {
  services[s] = true
}

const setAllModules = (status) =>
  Object.keys(MODULES)
    .reduce((a, v, i) => {
      a[v] = status
      return a
    }, {})

export default {
  source: {
    protocol: 'http',
    node: 'localhost',
    port: 4444,
    url: null
  },
  sourceRoutes: { // Nod3Router routes, used as default when source is an array of sources
    subscribe: 0, // delegates subscriptions to the first node
    rsk: 0, // delegates rsk module to the node that handle subscriptions
    trace: 1 // delegates trace_ module to the second node
  },
  api: {
    address: 'localhost',
    port: 3003,
    lastBlocks: 30,
    MIN_LIMIT: 10,
    LIMIT: 50,
    MAX_LIMIT: 500,
    MAX_PAGES: 10,
    enableMetrics: true,
    metricsPort: 4000,
    allowUserEvents: false,
    exposeDoc: false,
    // All modules are enabled as default
    modules: setAllModules(true),
    delayedFields,
    allowCountQueries: true
  },
  blocks: {
    enableMetrics: true,
    metricsPort: 4001,
    blocksQueueSize: 10,
    bcTipSize: 120,
    batchRequestSize: 100,
    debug: false,
    ports: [3010], // list of services ports, if the list runs out, the services will try to take the next  ports starting from the last
    address: '127.0.0.1',
    services
  },
  bitcoin: {
    // Any Bitcoin Core compatible endpoint: a self-hosted node or a provider. Providers
    // that authenticate by URL make this value itself a credential, which is why it reads
    // from the environment alongside DATABASE_URL rather than living in config.json.
    rpcUrl: process.env.BITCOIN_RPC_URL || 'http://localhost:8332',
    // First Bitcoin block of 2018, the month Rootstock launched: nothing earlier can
    // carry a merge-mining tag, so it is the natural floor for the backfill.
    startHeight: 501960,
    // Blocks are read this far behind the tip so ordinary reorgs settle before a height
    // is written, since a stored row is never revisited.
    confirmations: 100,
    // Trailing window the published share is computed over, about a week of Bitcoin.
    windowBlocks: 1000,
    // How far back each scheduled ingest looks. Bounded so a tick cannot become an
    // hours-long job, and never narrower than windowBlocks, so a gap that would stop the
    // rollup is always inside the range the next tick repairs.
    ingestLookbackBlocks: 1500,
    ingestConcurrency: 8,
    ingestBatchSize: 500,
    // Sustained request rate. Concurrency alone is not a rate: a provider absorbs a few
    // seconds of excess from burst capacity and then throttles, so this is what keeps a
    // multi-hour backfill inside the allowance. Every method used here costs the same, so
    // requests per second maps directly onto the provider's compute-unit budget. Set to 0
    // for a self-hosted node, which needs no pacing.
    requestsPerSecond: 25,
    requestTimeoutMs: 15000,
    maxRetries: 5,
    retryDelayMs: 1000
  },
  forceSaveBcStats: true,
  enableTxPoolFromApi: true
}

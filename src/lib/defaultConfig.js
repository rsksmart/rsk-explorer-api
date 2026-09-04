/**
 *  This file provides default values,
 *  use /config.json, to overwrite settings
 */
import { MODULES } from './types'
import delayedFields from './delayedFields'

const DEFAULT_BITCOIN_RPC_URL = 'http://localhost:8332'

// Bitcoin height at Rootstock mainnet block 1. A testnet deployment sets its own: the same height
// on Bitcoin testnet is three years earlier than Rootstock testnet's own first block.
const BITCOIN_HEIGHT_AT_ROOTSTOCK_MAINNET_LAUNCH = 502501

// 100 rather than the conventional 6: nothing ever re-reads a stored height, so a block that
// reorganises after being ingested stays wrong forever. The margin stands in for reorg handling,
// and spends only freshness that a ~7-day moving average does not use.
const CONFIRMATIONS_BEFORE_INDEXING = 100

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
    rpcUrl: DEFAULT_BITCOIN_RPC_URL,
    startHeight: BITCOIN_HEIGHT_AT_ROOTSTOCK_MAINNET_LAUNCH,
    confirmations: CONFIRMATIONS_BEFORE_INDEXING,
    windowBlocks: 1000,
    ingestLookbackBlocks: 1500,
    ingestConcurrency: 8,
    ingestBatchSize: 500,
    sustainedRequestsPerSecond: 25,
    requestTimeoutMs: 15000,
    maxRetries: 5,
    retryDelayMs: 1000
  },
  forceSaveBcStats: true,
  enableTxPoolFromApi: true
}

/**
 *  This file provides default values,
 *  use /config.json, to overwrite settings
 */
import { MODULES } from './types'
import delayedFields from './delayedFields'

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
  db: {
    protocol: 'postgres://',
    databaseName: 'explorer_db',
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 12345678
  },
  api: {
    address: 'localhost',
    port: 3003,
    lastBlocks: 30,
    MIN_LIMIT: 10,
    LIMIT: 50,
    MAX_LIMIT: 500,
    MAX_PAGES: 10,
    allowUserEvents: false,
    exposeDoc: false,
    // All modules are enabled as default
    modules: setAllModules(true),
    delayedFields
  },
  blocks: {
    blocksQueueSize: 10,
    bcTipSize: 120,
    batchRequestSize: 20,
    debug: false,
    ports: [3010], // list of services ports, if the list runs out, the services will try to take the next  ports starting from the last
    address: '127.0.0.1',
    services
  }
}

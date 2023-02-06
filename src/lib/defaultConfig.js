/**
 *  This file provides default values,
 *  use /config.json, to overwrite settings
 */
import { MODULES } from './types'
import delayedFields from './delayedFields'
import { servicesNames } from '../services/servicesConfig'

const services = Object.assign({}, servicesNames)
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
  log: {
    dir: '/var/log/rsk-explorer',
    level: 'info',
    logToFiles: false
  },
  db: {
    server: 'localhost',
    port: 27017,
    database: 'blockDB',
    prismaEngine: 'postgres',
    prismaPort: 5432,
    prismaDbName: 'explorer_db',
    prismaUser: 'postgres',
    prismaPassword: 12345678
  },
  api: {
    address: 'localhost',
    port: 3003,
    lastBlocks: 30,
    MIN_LIMIT: 10,
    LIMIT: 50,
    MAX_LIMIT: 500,
    MAX_PAGES: 10,
    allowUserEvents: true,
    exposeDoc: false,
    // All modules are enabled as default
    modules: setAllModules(true),
    delayedFields
  },
  blocks: {
    blocksQueueSize: 10,
    validateCollections: false,
    bcTipSize: 120,
    batchRequestSize: 20,
    debug: false,
    updateTokenBalances: true, // Update token accounts balances on next block
    ports: [3010], // list of services ports, if the list runs out, the services will try to take the next  ports starting from the last
    address: '127.0.0.1',
    services
  },
  collectionsNames: {
    Config: 'config',
    Blocks: 'blocks',
    Txs: 'transactions',
    Addrs: 'addresses',
    Status: 'status',
    Events: 'events',
    TokensAddrs: 'tokensAddresses',
    TxPool: 'txPool',
    PendingTxs: 'transactionsPending',
    Stats: 'statsCollection',
    BlocksSummary: 'blocksSummary',
    ContractVerification: 'contractsVerifications',
    VerificationsResults: 'verificationResults',
    InternalTransactions: 'internalTransactions',
    Balances: 'balances',
    BalancesLog: 'balancesLog',
    BlocksTraces: 'blockTraces'
  }
}

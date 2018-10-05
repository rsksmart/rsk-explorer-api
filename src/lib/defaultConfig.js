/**
 *  This file provides default values,
 *  use /config.json, to overwrite settings
 */
import { txTypes } from './types'
import delayedFields from './delayedFields'

export default {
  server: {
    port: 3003
  },
  source: {
    protocol: 'http',
    node: 'localhost',
    port: 4444
  },
  log: {
    dir: '/var/log/rsk-explorer',
    level: 'error'
  },
  db: {
    server: 'localhost',
    port: 27017,
    database: 'blockDB'
  },
  api: {
    lastBlocks: 30,
    perPage: 50,
    allowUserEvents: true,
    delayedFields
  },
  publicSettings: {
    bridgeAddress: '0x0000000000000000000000000000000001000006',
    remascAddress: '0x0000000000000000000000000000000001000008',
    txTypes
  },
  blocks: {
    blocksQueueSize: 100,
    validateCollections: true,
    bcTipSize: 12,
    batchRequestSize: 20,
    collections: {
      Blocks: 'blocks',
      Txs: 'transactions',
      Addrs: 'addresses',
      Status: 'status',
      Events: 'events',
      TokensAddrs: 'tokensAddresses',
      OrphanBlocks: 'orphanBlocks'
    }
  }
}

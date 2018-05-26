/**
 *  This file provides default values,
 *  use /config.json, to overwrite settings
 */
import { txTypes } from './types'
export default {
  server: {
    port: 3003
  },
  source: {
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
    lastBlocks: 10,
    perPage: 50

  },
  publicSettings: {
    bridgeAddress: '0x0000000000000000000000000000000001000006',
    remascAddress: '0x0000000000000000000000000000000001000008',
    contractDeployAddress: '0x0000000000000000000000000000000000000000',
    txTypes
  },
  blocks: {
    blocksQueueSize: 100,
    blocksCollection: 'blocks',
    txCollection: 'transactions',
    addrCollection: 'addresses',
    statusCollection: 'status',
    eventsCollection: 'events',
    tokenAddrCollection: 'tokensAddresses'
  }
}

"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;



var _types = require("./types");
var _delayedFields = _interopRequireDefault(require("./delayedFields"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };} /**
                                                                                                                                                                       *  This file provides default values,
                                                                                                                                                                       *  use /config.json, to overwrite settings
                                                                                                                                                                       */const setAllModules = (status) => Object.keys(_types.MODULES).
reduce((a, v, i) => {
  a[v] = status;
  return a;
}, {});var _default =

{
  source: {
    protocol: 'http',
    node: 'localhost',
    port: 4444,
    url: null },

  log: {
    dir: '/var/log/rsk-explorer',
    level: 'info' },

  db: {
    server: 'localhost',
    port: 27017,
    database: 'blockDB' },

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
    delayedFields: _delayedFields.default },

  blocks: {
    blocksQueueSize: 100,
    validateCollections: false,
    bcTipSize: 12,
    batchRequestSize: 20 },

  collectionsNames: {
    Config: 'config',
    Blocks: 'blocks',
    Txs: 'transactions',
    Addrs: 'addresses',
    Status: 'status',
    Events: 'events',
    TokensAddrs: 'tokensAddresses',
    OrphanBlocks: 'orphanBlocks',
    TxPool: 'txPool',
    PendingTxs: 'transactionsPending',
    Stats: 'statsCollection',
    BlocksSummary: 'blocksSummary',
    ContractVerification: 'contractsVerifications',
    VerificationsResults: 'verificationResults' } };exports.default = _default;
'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _DataCollector = require('./lib/DataCollector');
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _types = require('../lib/types');
var _Block = require('./modules/Block');
var _Tx = require('./modules/Tx');
var _Address = require('./modules/Address');
var _Event = require('./modules/Event');
var _TokenAccount = require('./modules/TokenAccount');
var _TxPending = require('./modules/TxPending');
var _Stats = require('./modules/Stats');
var _getCirculatingSupply = require('./lib/getCirculatingSupply');var _getCirculatingSupply2 = _interopRequireDefault(_getCirculatingSupply);
var _apiTools = require('./lib/apiTools');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}





const lastLimit = _config2.default.api.lastBlocks || 10;
const collections = _config2.default.blocks.collections;

class Api extends _DataCollector.DataCollector {
  constructor(db) {
    let collectionName = collections.Blocks;
    super(db, { collectionName });
    this.lastLimit = lastLimit;
    this.latest = 0;
    this.lastBlocks = [];
    this.lastTransactions = [];
    this.circulatingSupply = null;
    this.stats = { timestamp: 0 };
    this.addItem(collections.Blocks, 'Block', _Block.Block);
    this.addItem(collections.PendingTxs, 'TxPending', _TxPending.TxPending);
    this.addItem(collections.Txs, 'Tx', _Tx.Tx);
    this.addItem(collections.Addrs, 'Address', _Address.Address);
    this.addItem(collections.Events, 'Event', _Event.Event);
    this.addItem(collections.TokensAddrs, 'Token', _TokenAccount.TokenAccount);
    this.addItem(collections.Stats, 'Stats', _Stats.Stats);
  }
  tick() {
    this.setLastBlocks();
    this.setCirculatingSupply();
  }

  async run(payload) {
    try {
      if (Object.keys(payload).length < 1) throw new Error('invalid request');
      const action = payload.action;
      if (!action) throw new Error('Missing action');
      const params = (0, _apiTools.filterParams)(payload.params);
      const module = (0, _apiTools.getModule)(payload.module);
      if (!module) throw new Error('Unknown module');
      const delayed = (0, _apiTools.getDelayedFields)(module, action);
      const time = Date.now();
      const result = await this.itemPublicAction(module, action, params);

      const queryTime = Date.now() - time;
      const logCmd = queryTime > 1000 ? 'warn' : 'trace';
      this.log[logCmd](`${module}.${action}(${JSON.stringify(params)}) ${queryTime} ms`);

      return { module, action, params, result, delayed };
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async setLastBlocks() {
    try {
      let { collection, lastLimit, Tx } = this;
      let blocks = await collection.find().sort({ number: -1 }).limit(lastLimit).toArray();
      let txs = await Tx.db.find({ txType: { $in: [_types.txTypes.default, _types.txTypes.contract] } }).
      sort({ blockNumber: -1, transactionIndex: -1 }).
      limit(this.lastLimit).
      toArray();

      this.updateLastBlocks(blocks, txs);
    } catch (err) {
      this.log.debug(err);
    }
  }

  async setCirculatingSupply() {
    try {
      const collection = this.db.collection(collections.Addrs);
      let circulating = await (0, _getCirculatingSupply2.default)(collection);
      this.circulatingSupply = Object.assign({}, circulating);
    } catch (err) {
      this.log.debug(err);
    }
  }
  getCirculatingSupply() {
    return this.formatData(this.circulatingSupply);
  }

  getLastBlocks() {
    let blocks = this.lastBlocks;
    let transactions = this.lastTransactions;
    return this.formatData({ blocks, transactions });
  }

  getLastBlock() {
    return this.lastBlocks[0] || null;
  }

  updateLastBlocks(blocks, transactions) {
    this.lastBlocks = blocks;
    this.lastTransactions = transactions;
    let latest;
    if (blocks && blocks[0]) latest = blocks[0].number;
    if (latest !== this.latest) {
      this.latest = latest;
      this.events.emit('newBlocks', this.formatData({ blocks, transactions }));
      this.updateStats();
    }
  }

  async getAddress(address) {
    return this.Address.run('getAddress', { address });
  }

  async addAddressData(address, data, key = '_addressData') {
    const account = await this.getAddress(address);
    if (data && data.data && account) data.data[key] = account.data;
    return data || account;
  }

  async updateStats() {
    const oldStats = this.stats;
    const stats = await this.Stats.run('getLatest');
    if (!stats) return;
    this.stats = Object.assign({}, stats);
    if (stats.timestamp !== oldStats.timestamp) {
      this.events.emit('newStats', this.stats);
    }
  }}exports.default =


Api;
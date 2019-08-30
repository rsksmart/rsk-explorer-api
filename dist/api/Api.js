"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _DataCollector = require("./lib/DataCollector");
var _modules = require("./modules");
var _types = require("../lib/types");
var _getCirculatingSupply = _interopRequireDefault(require("./lib/getCirculatingSupply"));
var _blocksCollections = require("../lib/blocksCollections");
var _apiTools = require("./lib/apiTools");
var _config = _interopRequireDefault(require("../lib/config"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class Api extends _DataCollector.DataCollector {
  constructor({ db, initConfig, nativeContracts }, { modules, collectionsNames, lastBlocks } = {}) {
    const collectionName = collectionsNames.Blocks;
    super(db, { collectionName });
    this.collectionsNames = collectionsNames;
    this.collections = (0, _blocksCollections.getDbBlocksCollections)(db);
    this.lastLimit = lastBlocks || 10;
    this.latest = 0;
    this.lastBlocks = [];
    this.lastTransactions = [];
    this.circulatingSupply = null;
    this.stats = { timestamp: 0 };
    this.loadModules((0, _modules.getEnabledApiModules)(modules));
    this.initConfig = initConfig;
    const { isNativeContract } = nativeContracts;
    this.isNativeContract = isNativeContract;
  }
  tick() {
    this.setLastBlocks();
    this.setCirculatingSupply();
  }

  loadModules(modules) {
    Object.keys(modules).forEach(name => {
      const module = new modules[name](this.collections, name);
      this.log.info(`Loading module ${name}`);
      this.addModule(module, name);
    });
  }

  async run(payload) {
    try {
      if (Object.keys(payload).length < 1) throw new Error('invalid request');
      let { module, action, params } = payload;
      if (!action) throw new Error('Missing action');
      const moduleName = _apiTools.MODULES[module];
      if (!moduleName) throw new Error('Unknown module');
      const delayed = (0, _apiTools.getDelayedFields)(moduleName, action);
      const time = Date.now();
      params = (0, _apiTools.filterParams)(payload.params);
      const result = await this.getModule(moduleName).run(action, params);
      const queryTime = Date.now() - time;
      const logCmd = queryTime > 1000 ? 'warn' : 'trace';
      this.log[logCmd](`${module}.${action}(${JSON.stringify(params)}) ${queryTime} ms`);
      const res = { module, action, params, result, delayed };
      return res;
    } catch (err) {
      this.log.debug(err);
      return Promise.reject(err);
    }
  }

  info() {
    let info = Object.assign({}, this.initConfig);
    info.txTypes = Object.assign({}, _types.txTypes);
    info.modules = _config.default.api.modules;
    return info;
  }

  async setLastBlocks() {
    try {
      let { collection, lastLimit } = this;
      const Tx = this.getModule('Tx');
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
      const collection = this.collections.Addrs;
      let circulating = await (0, _getCirculatingSupply.default)(collection, this.initConfig.nativeContracts);
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
    return this.getModule('Address').run('getAddress', { address });
  }

  async addAddressData(address, data, key = '_addressData') {
    const account = await this.getAddress(address);
    if (data && data.data && account) data.data[key] = account.data;
    return data || account;
  }

  getPendingTransaction(params) {
    return this.getModule('TxPending').run('getPendingTransaction', params);
  }

  async updateStats() {
    const oldStats = this.stats;
    const stats = await this.getModule('Stats').run('getLatest');
    if (!stats) return;

    const ExtendedStats = this.getModule('ExtendedStats');
    if (ExtendedStats) {
      const blockNumber = parseInt(stats.blockNumber);
      const extendedStats = await ExtendedStats.getExtendedStats(blockNumber);
      Object.assign(stats, extendedStats);
    }

    this.stats = Object.assign({}, stats);
    if (stats.timestamp !== oldStats.timestamp) {
      this.events.emit('newStats', this.stats);
    }
  }}var _default =


Api;exports.default = _default;
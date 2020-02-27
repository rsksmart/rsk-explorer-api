"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _DataCollector = require("./lib/DataCollector");
var _modules = require("./modules");
var _types = require("../lib/types");
var _blocksCollections = require("../lib/blocksCollections");
var _apiTools = require("./lib/apiTools");
var _config = _interopRequireDefault(require("../lib/config"));
var _NativeContracts = _interopRequireDefault(require("../lib/NativeContracts"));

var _getCirculatingSupply = _interopRequireDefault(require("./lib/getCirculatingSupply"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };} // It is used only in case Stats cannot provide the circulating supply

class Api extends _DataCollector.DataCollector {
  constructor({ db, initConfig }, { modules, collectionsNames, lastBlocks } = {}) {
    const collectionName = collectionsNames.Blocks;
    super(db, { collectionName });
    this.collectionsNames = collectionsNames;
    this.collections = (0, _blocksCollections.getDbBlocksCollections)(db);
    this.lastLimit = lastBlocks || 100;
    this.latest = undefined;
    this.lastBlocks = { data: [] };
    this.lastTransactions = { data: [] };
    this.circulatingSupply = null;
    this.stats = { timestamp: 0 };
    this.loadModules((0, _modules.getEnabledApiModules)(modules));
    this.initConfig = initConfig;
    const { isNativeContract } = (0, _NativeContracts.default)(initConfig);
    this.isNativeContract = isNativeContract;
    this.tick();
  }
  tick() {
    this.setLastBlocks();
  }

  loadModules(modules) {
    Object.keys(modules).forEach(name => {
      const constructor = modules[name];
      if (typeof constructor === 'function') {
        const module = new constructor(this.collections, name);
        this.log.info(`Loading module ${name}`);
        this.addModule(module, name);
      }
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
      const Block = this.getModule('Block');
      const Tx = this.getModule('Tx');
      let limit = this.lastLimit;
      let blocks = await Block.run('getBlocks', { limit, addMetadata: true });
      let query = { txType: [_types.txTypes.default, _types.txTypes.contract] };
      let transactions = await Tx.run('getTransactions', { query, limit });
      this.updateLastBlocks(blocks, transactions);
    } catch (err) {
      this.log.debug(err);
    }
  }
  getStats() {
    return this.formatData(this.stats);
  }
  getCirculatingSupply() {
    return this.formatData(this.circulatingSupply);
  }

  getLastBlocks() {
    let data = this.lastBlocks;
    return this.formatData(data);
  }

  getLastTransactions() {
    let data = this.lastTransactions;
    return this.formatData(data);
  }

  getLastBlock() {
    let { data } = this.lastBlocks;
    return data[0] || null;
  }

  updateLastBlocks(blocks, transactions) {
    let blockData = blocks.data;
    this.lastBlocks = blocks;
    this.lastTransactions = transactions;
    let latest;
    if (blockData && blockData[0]) latest = blockData[0].number;
    if (latest !== this.latest) {
      this.latest = latest;
      this.events.emit('newBlocks', this.getLastBlocks());
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
    const Stats = await this.getModule('Stats');
    if (!Stats) return;
    const stats = await Stats.run('getLatest');
    if (!stats) return;

    /*     const ExtendedStats = this.getModule('ExtendedStats')
                            if (ExtendedStats) {
                              const blockNumber = parseInt(stats.blockNumber)
                              const extendedStats = await ExtendedStats.getExtendedStats(blockNumber)
                              Object.assign(stats, extendedStats)
                            } */
    let circulatingSupply = stats.circulatingSupply || (await this.getCirculatingSupplyFromDb());
    this.circulatingSupply = circulatingSupply;
    this.stats = Object.assign({}, stats);
    let timestamp = stats.timestamp || 0;
    if (timestamp > oldStats.timestamp) {
      this.events.emit('newStats', this.getStats());
    }
  }
  async getCirculatingSupplyFromDb() {
    try {
      const collection = this.collections.Addrs;
      const { nativeContracts } = this.initConfig;
      let circulating = await (0, _getCirculatingSupply.default)(collection, nativeContracts);
      return circulating;
    } catch (err) {
      this.log.debug(err);
    }
  }}var _default =


Api;exports.default = _default;
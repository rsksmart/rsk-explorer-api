"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.BcStats = void 0;var _BlocksBase = require("../../lib/BlocksBase");
var _getCirculatingSupply = _interopRequireDefault(require("../../api/lib/getCirculatingSupply"));
var _getActiveAccounts = _interopRequireDefault(require("../../api/lib/getActiveAccounts"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class BcStats extends _BlocksBase.BlocksBase {
  constructor(db, options) {
    super(db, options);
    this.collection = this.collections.Stats;
    this.stats = { blockHash: undefined, blockNumber: undefined };
  }

  async getCirculating() {
    try {
      const collection = this.collections.Addrs;
      const { nativeContracts } = this.initConfig;
      let circulating = await (0, _getCirculatingSupply.default)(collection, nativeContracts);
      return circulating;
    } catch (err) {
      this.log.debug(err);
    }
  }

  async getStats(blockHash, blockNumber) {
    try {
      if (undefined === blockHash || undefined === blockNumber) {
        const block = await this.nod3.eth.getBlock('latest');
        blockHash = block.hash;
        blockNumber = block.number;
      }
      if (this.skip(blockHash, blockNumber)) return;
      const hashrate = await this.nod3.eth.netHashrate();
      const circulating = await this.getCirculating();
      let activeAccounts = await (0, _getActiveAccounts.default)(this.collections);
      const timestamp = Date.now();
      return Object.assign({}, { circulating, activeAccounts, hashrate, timestamp, blockHash, blockNumber });
    } catch (err) {
      this.log.error(err);
      return Promise.reject(err);
    }
  }

  async update({ hash, number }) {
    try {
      const stats = await this.getStats(hash, number);
      if (!stats) throw new Error('empty stats');
      return this.save(stats);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async save(stats) {
    try {
      const result = await this.collection.insertOne(stats);
      return result;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  skip(hash, number) {
    const { blockHash, blockNumber } = this.stats;
    return blockHash === hash && blockNumber === number;
  }}exports.BcStats = BcStats;
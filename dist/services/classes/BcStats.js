"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.BcStats = void 0;var _BlocksBase = require("../../lib/BlocksBase");
var _getCirculatingSupply = _interopRequireDefault(require("../../api/lib/getCirculatingSupply"));
var _getActiveAccounts = _interopRequireDefault(require("../../api/lib/getActiveAccounts"));
var _rskContractParser = require("@rsksmart/rsk-contract-parser");
var _utils = require("../../lib/utils");
var _stats = require("../../repositories/stats.repository");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

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

  async bridgeCall(method, params = []) {
    try {
      const { nod3, initConfig } = this;
      const address = initConfig.nativeContracts.bridge;
      const abi = _rskContractParser.abi.bridge;
      const contract = (0, _rskContractParser.Contract)(abi, { address, nod3 });
      const res = await contract.call(method, params);
      return res;
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
      let lockingCap = await this.bridgeCall('getLockingCap');
      // lockingCap = lockingCap.toString()
      const bridge = (0, _utils.serialize)({ lockingCap });
      const timestamp = Date.now();
      const res = Object.assign({}, { circulating, activeAccounts, hashrate, timestamp, blockHash, blockNumber, bridge });
      return res;
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
      const result = await _stats.statsRepository.insertOne(stats, this.collection);
      return result;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  skip(hash, number) {
    const { blockHash, blockNumber } = this.stats;
    return blockHash === hash && blockNumber === number;
  }}exports.BcStats = BcStats;
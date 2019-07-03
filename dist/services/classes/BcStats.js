'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.BcStats = undefined;var _BlocksBase = require('../../lib/BlocksBase');

class BcStats extends _BlocksBase.BlocksBase {
  constructor(db, options) {
    super(db, options);
    this.collection = this.collections.Stats;
    this.stats = { blockHash: undefined, blockNumber: undefined };
  }

  async getStats(blockHash, blockNumber) {
    try {
      if (undefined === blockHash || undefined === blockNumber) {
        const block = await this.nod3.eth.getBlock('latest');
        blockHash = block.hash;
        blockNumber = block.number;
      }
      if (this.skip(blockHash, blockNumber)) return;
      const hashRate = await this.nod3.eth.netHashrate();
      const timestamp = Date.now();
      return { hashRate, timestamp, blockHash, blockNumber };
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
      const result = this.collection.insertOne(stats);
      return result;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  skip(hash, number) {
    const { blockHash, blockNumber } = this.stats;
    return blockHash === hash && blockNumber === number;
  }}exports.BcStats = BcStats;
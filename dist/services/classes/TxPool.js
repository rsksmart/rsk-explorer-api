"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Pool = Pool;exports.default = exports.TxPool = void 0;var _BlocksBase = require("../../lib/BlocksBase");
var _utils = require("../../lib/utils");
var _txPool = require("../../repositories/txPool.repository");
var _txPending = require("../../repositories/txPending.repository");

class TxPool extends _BlocksBase.BlocksBase {
  constructor(db, options) {
    super(db, options);
    this.status = {};
    this.pool = {};
    this.TxPool = this.collections.TxPool;
    this.PendingTxs = this.collections.PendingTxs;
  }

  async start() {
    try {
      let connected = await this.nod3.isConnected();
      if (!connected) {
        this.log.debug('nod3 is not connected');
        return this.start();
      }
      // status filter
      let status = await this.nod3.subscribe.method('txpool.status');
      status.watch(status => {
        this.updateStatus(status);
      }, err => {
        this.log.debug(`Pool filter error: ${err}`);
      });
    } catch (err) {
      this.log.debug(`TxPool error: ${err}`);
    }
  }

  updateStatus(newStatus) {
    const status = Object.assign({}, this.status);
    let changed = Object.keys(newStatus).find(k => newStatus[k] !== status[k]);
    if (changed) {
      this.log.debug(`TxPool status changed: pending: ${newStatus.pending} queued: ${newStatus.queued}`);
      this.status = Object.assign({}, newStatus);
      this.updatePool();
    }
    // let action = this.actions.TXPOOL_UPDATE
    // process.send({ action, args: [status] })
  }
  async getPool() {
    try {
      let res = await this.nod3.batchRequest([
      ['txpool.content'],
      ['eth.blockNumber']]);

      if (res.length !== 2) throw new Error(`Invalid request ${res}`);
      return this.formatPool(res[0], res[1]);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  formatPool(pool, blockNumber) {
    let keys = Object.keys(pool);
    keys.forEach(k => {pool[k] = this.formatPoolProp(pool[k], k, blockNumber);});
    let totals = keys.
    reduce((o, v) => {
      o[v] = pool[v].length;
      return o;
    }, {});

    let txs = Object.values(pool).reduce((a, i) => a.concat(i), []);
    return Object.assign(totals, { txs, blockNumber });
  }

  formatPoolProp(prop, status) {
    let res = [];
    Object.values(prop).
    forEach(nonce => Object.values(nonce).
    forEach(txs => txs.forEach(tx => {
      tx.status = String(status).toUpperCase();
      res.push(this.formatFields(tx));
    })));
    return res;
  }

  // fix rskj txpool bad responses
  // see: https://github.com/rsksmart/rskj/issues/689
  formatFields(values) {
    let fields = ['hash', 'from', 'to'];
    fields.forEach(f => {values[f] = this.add0x(values[f]);});

    // see: https://github.com/rsksmart/rskj/issues/689
    let input = values.input;
    if (input) {
      input = (0, _utils.isHexString)(input) ? input : (0, _utils.base64toHex)(input);
      values.input = input;
    }

    return values;
  }

  // see: https://github.com/rsksmart/rskj/issues/689
  add0x(value) {
    if (value && (0, _utils.isHexString)(value) && !/^0x/.test(value)) value = `0x${value}`;
    return value;
  }

  async updatePool() {
    try {
      let pool = await this.getPool();
      if (!pool) throw new Error('getPool returns nothing');
      pool.timestamp = Date.now();
      this.pool = pool;
      return this.savePoolToDb(pool);
    } catch (err) {
      this.log.error(err);
      return Promise.reject(err);
    }
  }

  async savePoolToDb(pool) {
    try {
      this.log.debug(`Saving txPool to db`);
      await _txPool.txPoolRepository.insertOne(pool, this.TxPool);
      await this.savePendingTxs(pool.txs);
    } catch (err) {
      this.log.error(`Error saving txPool: ${err}`);
      return Promise.reject(err);
    }
  }

  async savePendingTxs(txs) {
    try {
      txs = txs || [];
      await Promise.all(txs.map(tx => _txPending.txPendingRepository.updateOne({ hash: tx.hash }, { $set: tx }, { upsert: true }, this.PendingTxs)));
    } catch (err) {
      this.log.error(`Error saving pending transactions: ${err}`);
      return Promise.reject(err);
    }
  }}exports.TxPool = TxPool;


function Pool(db, config) {
  return new TxPool(db, config);
}var _default =

Pool;exports.default = _default;
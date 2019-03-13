'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _DataCollector = require('../lib/DataCollector');
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _types = require('../lib/types');
var _Block = require('./Block');
var _Tx = require('./Tx');
var _Address = require('./Address');
var _Event = require('./Event');
var _TokenAccount = require('./TokenAccount');
var _TxPending = require('./TxPending');
var _getCirculatingSupply = require('./getCirculatingSupply');var _getCirculatingSupply2 = _interopRequireDefault(_getCirculatingSupply);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const lastLimit = _config2.default.api.lastBlocks || 10;
const collections = _config2.default.blocks.collections;

class Blocks extends _DataCollector.DataCollector {
  constructor(db) {
    let collectionName = collections.Blocks;
    super(db, { collectionName });
    this.lastLimit = lastLimit;
    this.latest = 0;
    this.lastBlocks = [];
    this.lastTransactions = [];
    this.circulatingSupply = null;
    this.addItem(collections.Blocks, 'Block', _Block.Block);
    this.addItem(collections.PendingTxs, 'TxPending', _TxPending.TxPending);
    this.addItem(collections.Txs, 'Tx', _Tx.Tx);
    this.addItem(collections.Addrs, 'Address', _Address.Address);
    this.addItem(collections.Events, 'Event', _Event.Event);
    this.addItem(collections.TokensAddrs, 'Token', _TokenAccount.TokenAccount);
  }
  tick() {
    this.setLastBlocks();
    this.setCirculatingSupply();
  }

  run(module, action, params) {
    return this.itemPublicAction(module, action, params);
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
      console.log(err);
    }
  }

  async setCirculatingSupply() {
    try {
      const collection = this.db.collection(collections.Addrs);
      let circulating = await (0, _getCirculatingSupply2.default)(collection);
      this.circulatingSupply = Object.assign({}, circulating);
    } catch (err) {
      console.log(err);
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
    }
  }

  async getAddress(address) {
    return this.Address.run('getAddress', { address });
  }

  async addAddressData(address, data, key = '_addressData') {
    const account = await this.getAddress(address);
    if (data && data.data && account) data.data[key] = account.data;
    return data || account;
  }}exports.default =


Blocks;
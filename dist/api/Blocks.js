'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _DataCollector = require('../lib/DataCollector');
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _Block = require('./Block');
var _Tx = require('./Tx');
var _Address = require('./Address');
var _Event = require('./Event');
var _TokenAccount = require('./TokenAccount');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const perPage = _config2.default.api.perPage;
const lastLimit = _config2.default.api.lastBlocks || 10;
const collections = _config2.default.blocks.collections;
class Blocks extends _DataCollector.DataCollector {
  constructor(db) {
    let collectionName = collections.Blocks;
    super(db, { perPage, collectionName });
    this.lastLimit = lastLimit;
    this.latest = 0;
    this.lastBlocks = [];
    this.lastTransactions = [];
    this.addItem(collections.Blocks, 'Block', _Block.Block, true);
    this.addItem(collections.Txs, 'Tx', _Tx.Tx, true);
    this.addItem(collections.Addrs, 'Address', _Address.Address, true);
    this.addItem(collections.Events, 'Event', _Event.Event, true);
    this.addItem(collections.TokensAddrs, 'Token', _TokenAccount.TokenAccount, true);
  }
  tick() {
    this.setLastBlocks();
  }

  run(module, action, params) {
    return this.itemPublicAction(module, action, params);
  }
  setLastBlocks() {
    this.collection.
    find().
    sort({ number: -1 }).
    limit(this.lastLimit).
    toArray((err, blocks) => {
      if (err) console.log(err);else
      {
        this.Tx.db.
        find().
        sort({ blockNumber: -1, transactionIndex: -1 }).
        limit(this.lastLimit).
        toArray((err, txs) => {
          if (err) console.log(err);else
          {
            this.updateLastBlocks(blocks, txs);
          }
        });
      }
    });
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

  async addAddressData(address, data, key = '_addressData') {
    const account = await this.Address.run('getAddress', { address });
    if (data && account) data.data[key] = account.data;
    return data || account;
  }}exports.default =


Blocks;
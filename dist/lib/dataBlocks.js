'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _dataCollector = require('./dataCollector');

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const perPage = _config2.default.api.perPage;
const keyName = 'address';
const collectionName = _config2.default.blocks.blockCollection || 'blocks';

class Blocks extends _dataCollector.DataCollector {
  constructor(db) {
    super(db, { perPage, collectionName });
    this.lastLimit = _config2.default.api.lastBlocks || 50;
    this.latest = 0;
    this.last = [];
    this.Block = new Block(this.collection);
  }
  tick() {
    this.setLastBlocks();
  }

  run(action, params) {
    return this.itemPublicAction(action, params, this.Block);
  }
  setLastBlocks() {
    this.collection.find().sort({ number: -1 }).limit(this.lastLimit).toArray((err, docs) => {
      if (err) console.log(err);else this.updateLastBlocks(docs);
    });
  }

  getLastBlocks() {
    return { DATA: this.last };
  }

  updateLastBlocks(blocks) {
    this.last = blocks;
    let latest = blocks[0].number;
    if (latest !== this.latest) {
      this.latest = latest;
      this.events.emit('newBlocks', { DATA: blocks });
    }
    //this.events.emit('newBlocks', blocks)
  }
}

class Block extends _dataCollector.DataCollectorItem {
  constructor(collection) {
    super(collection);
    this.publicActions = {
      getBlock: params => {
        let number = parseInt(params.block);
        return this.getOne({ number });
      },
      getTransaction: params => {
        let txHash = params.tx.toString();
        return this.getOne({ 'transactions.hash': txHash }).then(data => {
          let block = data.DATA;
          if (block) {
            let transactions = block.transactions;
            if (transactions) {
              let DATA = transactions.find(tx => {
                return tx.hash === txHash;
              });
              return { DATA };
            }
          }
        });
      },
      getBlocks: params => {
        return this.getPageData({}, params, { number: -1 });
      },
      getTransactions: params => {
        return this.getPageData({}, params, { number: -1 });
      }
    };
  }
}

exports.default = Blocks;
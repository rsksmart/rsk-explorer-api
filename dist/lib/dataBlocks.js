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
    return this.formatData(this.last);
  }

  updateLastBlocks(blocks) {
    this.last = blocks;
    let latest = blocks[0].number;
    if (latest !== this.latest) {
      this.latest = latest;
      this.events.emit('newBlocks', this.formatData(blocks));
    }
    //this.events.emit('newBlocks', blocks)
  }
}

class Block extends _dataCollector.DataCollectorItem {
  constructor(collection) {
    super(collection);
    this.publicActions = {
      getBlock: params => {
        let number = parseInt(params.number);
        return this.getPrevNext(params, { number: { $gt: number - 2 } }, {}, { number: 1 });
      },
      getBlocks: params => {
        return this.getPageData({}, params, { number: -1 });
      },
      getTx: params => {
        let hash = params.hash.toString();
        return this.getOne({
          transactions: { $elemMatch: { hash } }
        }).then(res => {
          let transactions;
          if (res && res.DATA) transactions = res.DATA.transactions;
          if (transactions) {
            let DATA = transactions.find(tx => {
              return tx.hash === hash;
            });
            return { DATA, transactions };
          }
        });
      },
      /*       getTransaction: params => {
        let hash = params.hash.toString()
        params.skip = 0
        params.perPage = 3
        params.page = 1
        let aggregate = [
          { $project: { transactions: 1, timestamp: 1 } },
          { $unwind: '$transactions' }
        ]
        return this.getAggPages(aggregate.concat(), params).then(pages => {
          params.TOTAL = pages.total
          return this._aggregatePages(aggregate, params).then(res => {
            console.log('RES', res.length)
          })
        })
      }, */
      getTransaction: params => {
        return this.publicActions.getTx(params).then(res => {
          let DATA = res.DATA;
          let transactions = res.transactions;
          if (DATA && transactions) {
            let index = DATA.transactionIndex;
            let PREV = transactions[index - 1];
            let NEXT = transactions[index + 1];
            if (PREV && NEXT) return { DATA, PREV, NEXT };else {
              let block = DATA.blockNumber;
              return this.txBlock(block - 1).then(trans => {
                PREV = trans ? trans[trans.length - 1] : null;
                return this.txBlock(block + 1).then(trans => {
                  NEXT = trans ? trans[0] : null;
                  return { DATA, PREV, NEXT };
                });
              });
            }
          }
        });
      },
      getTransactions: params => {
        let aggregate = [{ $project: { transactions: 1, timestamp: 1 } }, { $unwind: '$transactions' }];
        return this.getAggPageData(aggregate, params, { _id: -1 });
      }
    };
  }
  txBlock(number) {
    return this.getOne({ number }).then(res => {
      return res && res.DATA ? res.DATA.transactions : null;
    });
  }
}

exports.default = Blocks;
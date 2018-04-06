'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _web = require('web3');

var _web2 = _interopRequireDefault(_web);

var _web3Connect = require('../../lib/web3Connect');

var _web3Connect2 = _interopRequireDefault(_web3Connect);

var _Db = require('../../lib/Db');

var dataBase = _interopRequireWildcard(_Db);

var _txFormat = require('../../lib/txFormat');

var _txFormat2 = _interopRequireDefault(_txFormat);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const blocksCollections = {
  blocksCollection: [{
    key: { number: 1 },
    unique: true
  }],
  txCollection: [{
    key: { hash: 1 },
    unique: true
  }, {
    key: {
      blockNumber: 1,
      transactionIndex: 1
    },
    name: 'blockTrasaction'
  }, {
    key: { from: 1 },
    name: 'fromIndex'
  }, {
    key: { to: 1 },
    name: 'toIndex'
  }],
  accountsCollection: [{
    key: { address: 1 },
    unique: true
  }],
  statsCollection: [{
    key: { timestamp: 1 },
    unique: true
  }]
};

function blocks(config, db) {
  let queue = [];
  let log = config.Logger || console;
  for (let c in blocksCollections) {
    let name = config[c] || c;
    queue.push(dataBase.createCollection(db, name, blocksCollections[c]));
  }
  return Promise.all(queue).then(collections => {
    return new SaveBlocks(config, ...collections);
  }).catch(err => {
    log.error('Error creating collections');
    log.error(err);
    process.exit(9);
  });
}
class SaveBlocks {
  constructor(options, blocksCollection, txCollection, accountsCollection, statsCollection) {
    this.node = options.node;
    this.port = options.port;
    this.Blocks = blocksCollection;
    this.Txs = txCollection;
    this.Stats = statsCollection;
    this.Accounts = accountsCollection;
    this.web3 = (0, _web3Connect2.default)(options.node, options.port);
    this.requestingBlocks = new Proxy({}, {
      set: (obj, prop, val) => {
        if (prop !== 'latest') obj[prop] = val;
        return true;
      }
    });
    this.blocksQueueSize = options.blocksQueueSize || 30; // max blocks per queue
    this.blocksQueue = null;
    this.log = options.Logger || console;
    this.state = {};
  }

  start() {
    if (this.web3 && this.web3.isConnected()) {
      // node is syncing
      this.web3.eth.isSyncing((err, sync) => {
        this.log.debug('Node isSyncing');
        if (!err) {
          this.updateState({ sync });
          if (sync === true) {
            this.web3.reset(true);
            this.checkDB();
          } else if (sync) {
            let block = sync.currentBlock;
            this.getBlocksFrom(block);
          } else {
            this.checkAndListen();
          }
        } else {
          this.log.error('syncing error', err);
        }
      });

      if (!this.web3.eth.syncing) this.checkAndListen();
    } else {
      this.log.warn('Web3 is not connected!');
      this.start();
    }
  }

  checkDB() {
    this.log.info('checkig db');
    return this.getBlockAndSave('latest').then(blockData => {
      return this.getMissingBlocks();
    }).catch(err => {
      this.log.error('Error getting latest block: ' + err);
      process.exit();
    });
  }

  isDbOutdated() {
    return this.dbBlocksStats().then(res => {
      console.log(res);
      this.updateState({ res });
      return res.lastBlock > res.blocks ? res.lastBlock : null;
    });
  }
  async dbBlocksStats() {
    let lastBlock = await this.getHighDbBlock();
    lastBlock = lastBlock.number;
    let blocks = await this.countDbBlocks();
    return { blocks, lastBlock };
  }

  getMissingBlocks() {
    return this.isDbOutdated().then(checkFromBlock => {
      this.blocksQueue = checkFromBlock;
      return this.processBlocksQueue();
    });
  }
  processBlocksQueue() {
    return new Promise((resolve, reject) => {
      let pending = this.makeBlockQueue();
      if (pending) {
        Promise.all(pending).then(values => {
          this.processBlocksQueue();
        }, reason => {
          this.log.error(reason);
          reject(reason);
        });
      } else {
        resolve();
      }
    });
  }
  makeBlockQueue() {
    if (this.blocksQueue > -1) {
      let pending = [];
      for (let i = 0; i < this.blocksQueueSize; i++) {
        pending.push(this.getBlockIfNotExistsInDb(this.blocksQueue));
        this.blocksQueue--;
      }
      return pending;
    }
  }

  updateState(newState) {
    for (let p in newState) {
      this.state[p] = newState[p];
    }
    this.state.timestamp = Date.now();
    this.saveStatsToDb();
  }

  saveStatsToDb() {
    let stats = Object.assign({}, this.state);
    this.Stats.insertOne(stats).catch(err => {
      this.log.error(err);
    });
  }
  listenBlocks() {
    this.log.info('Listen to blocks...');
    this.web3.reset(true);
    let filter = this.web3.eth.filter({ fromBlock: 'latest', toBlock: 'latest' });
    filter.watch((error, log) => {
      if (error) {
        this.log.error('Filter Watch Error: ' + error);
      } else if (log === null) {
        this.log.warn('Warning: null block hash');
      } else {
        let blockNumber = log.blockNumber || null;
        if (blockNumber) {
          this.log.info('New Block:', blockNumber);
          this.getBlocksFrom(blockNumber);
        } else {
          this.log.warn('Error, log.blockNumber is empty');
        }
      }
    });
  }
  getDbBlock(blockNumber) {
    return this.Blocks.findOne({ number: blockNumber }).then(doc => {
      return doc;
    });
  }
  getBlockIfNotExistsInDb(blockNumber) {
    return this.getDbBlock(blockNumber).then(block => {
      if (!block) {
        this.log.debug('Missing block ' + blockNumber);
        return this.getBlockAndSave(blockNumber);
      }
    });
  }
  getHighDbBlock() {
    return this.Blocks.findOne({}, { sort: { number: -1 } });
  }
  countDbBlocks() {
    return this.Blocks.count({});
  }
  getBlockAndSave(blockNumber) {
    return new Promise((resolve, reject) => {
      if (!blockNumber && blockNumber !== 0) reject('blockHashOrNumber is:' + blockNumber);

      if (this.web3.isConnected()) {
        if (!this.requestingBlocks[blockNumber]) {
          this.log.debug('Getting Block: ', blockNumber);
          this.requestingBlocks[blockNumber] = true;
          this.web3.eth.getBlock(blockNumber, true, (err, blockData) => {
            if (err) {
              reject('Warning: error on getting block with hash/number: ' + blockNumber + ': ' + err);
            } else {
              if (!blockData) {
                reject('Warning: null block data received from ' + blockNumber);
              } else {
                this.log.debug('New Block Data', blockData.number, blockData.timestamp);
                delete this.requestingBlocks[blockData.number];
                resolve(this.writeBlockToDB(blockData));
              }
            }
          });
        }
      } else {
        this.start();
      }
    }).catch(err => {
      this.requestingBlocks[blockNumber] = false;
      this.log.error(err);
      this.start();
    });
  }

  extractTransactionsAccounts(transactions) {
    let accounts = [];
    for (let tx of transactions) {
      accounts.push(this.accountDoc(tx.from));
      accounts.push(this.accountDoc(tx.to));
    }
    return accounts;
  }
  accountDoc(address) {
    return { address, balance: 0 };
  }

  getBlockTransactions(blockData) {
    let transactions = blockData.transactions;
    if (transactions) {
      transactions = transactions.map(tx => {
        tx.timestamp = blockData.timestamp;
        return (0, _txFormat2.default)(tx);
      });
    }
    return transactions;
  }

  insertBlock(blockData) {
    return this.Blocks.insertOne(blockData);
  }

  insertAccounts(accounts) {
    for (let account of accounts) {
      this.web3.eth.getBalance(account.address, 'latest', (err, balance) => {
        if (err) this.log.error(`Error getting balance of account ${account.address}: ${err}`);else account.balance = balance;
        this.log.info(`Updating account: ${account.address}`);
        this.log.debug(JSON.stringify(account));
        this.Accounts.updateOne({ address: account.address }, { $set: account }, { upsert: true }).catch(err => {
          this.log.error(err);
        });
      });
    }
  }

  writeBlockToDB(blockData) {
    return new Promise((resolve, reject) => {
      if (!blockData) reject('no blockdata');
      blockData._received = Date.now();
      let transactions = this.getBlockTransactions(blockData);
      delete blockData.transactions;
      blockData.txs = transactions.length;
      let accounts = this.extractTransactionsAccounts(transactions);
      // insert block
      this.Blocks.insertOne(blockData).then(res => {
        this.log.info('Inserted Block ' + blockData.number);

        // insert transactions
        if (transactions.length) {
          this.Txs.insertMany(transactions).then(res => {
            this.log.debug(dataBase.insertMsg(res, transactions, 'transactions'));
            resolve(blockData);
          }).catch(err => {
            // insert txs error
            let errorMsg = 'Error inserting txs ' + err;
            if (err.code !== 11000) {
              this.log.error(errorMsg);
              reject(err);
            } else {
              this.log.debug(errorMsg);
              resolve(blockData);
            }
          });
        }
        this.insertAccounts(accounts);
      }).catch(err => {
        // insert block error
        if (err.code === 11000) {
          this.log.debug('Skip: Duplicate key ' + blockData.number.toString());
          resolve(blockData);
        } else {
          this.log.error('Error: Aborted due to error on ' + 'block number ' + blockData.number.toString() + ': ' + err);
          process.exit(9);
        }
      });
    });
  }
  getBlocksFrom(blockNumber) {
    if (this.requestingBlocks[blockNumber]) blockNumber--;
    this.log.debug('Getting block from ', blockNumber);
    this.getDbBlock(blockNumber).then(block => {
      if (!block) {
        this.getBlockAndSave(blockNumber);
        blockNumber--;
        this.getBlocksFrom(blockNumber);
      }
    });
  }

  checkAndListen() {
    this.updateState({ sync: this.web3.eth.syncing });
    this.checkDB();
    this.listenBlocks();
  }
}

exports.default = blocks;
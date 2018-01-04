'use strict';

var _db = require('../../lib/db.js');

var _db2 = _interopRequireDefault(_db);

var _config = require('../../lib/config');

var _config2 = _interopRequireDefault(_config);

var _Blocks = require('./Blocks');

var _Blocks2 = _interopRequireDefault(_Blocks);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const config = Object.assign({}, _config2.default.blocks);

_db2.default.then(db => {
  console.log('Using configuration:');
  console.log(config);

  createCollection(db, config.blocksCollection, [{
    key: { number: 1 },
    unique: true
  }]).then(blocksCollection => {
    createCollection(db, config.txCollection, [{
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
    }]).then(txCollection => {
      createCollection(db, config.accountsCollection, [{
        key: { address: 1 },
        unique: true
      }]).then(accountsCollection => {
        const exporter = new _Blocks2.default(config, blocksCollection, txCollection, accountsCollection);
        exporter.grabBlocks();
        exporter.patchBlocks();
      });
    });
  });
});

const indexesError = collectionName => {
  console.log('Error creating' + collectionName + 'indexes');
  process.exit(9);
};

const createCollection = (db, collectionName, indexes) => {
  let collection = db.collection(collectionName);
  return collection.createIndexes(indexes).then(doc => {
    if (!doc.ok) indexesError(collectionName);
    return collection;
  });
};

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
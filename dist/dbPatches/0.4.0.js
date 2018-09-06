'use strict';var _dataSource = require('../lib/dataSource.js');var _dataSource2 = _interopRequireDefault(_dataSource);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _txFormat = require('../lib/txFormat');var _txFormat2 = _interopRequireDefault(_txFormat);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

_dataSource2.default.then(db => {
  const blocks = _config2.default.blocks.blocksCollection;
  const blocksCollection = db.collection(blocks);
  blocksCollection.dropIndexes().then(res => {
    console.log(`${blocks} collection indexes are removed`);
    console.log('Updating transactions.txType');
    const txsCollection = db.collection(_config2.default.blocks.txCollection);
    txsCollection.find({}).forEach(tx => {
      let oldType = tx.txType;
      let hash = tx.hash;
      tx = (0, _txFormat2.default)(tx);
      let txType = tx.txType;
      if (txType !== oldType) {
        txsCollection.updateOne({ hash }, { $set: { txType } }).then(res => {
          console.log(`Tx: ${hash} has changed type from ${oldType} to ${tx.txType}`);
        });
      } else {
        console.log(`Tx ${tx.hash} was processed`);
      }
    }).then(() => {
      process.exit(0);
    });
  }).catch(err => {
    console.error(`Error removing ${blocks} indexes: ${err}`);
  });
});
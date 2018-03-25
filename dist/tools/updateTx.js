'use strict';

var _config = require('../lib/config');

var _config2 = _interopRequireDefault(_config);

var _dataSource = require('../lib/dataSource');

var _dataSource2 = _interopRequireDefault(_dataSource);

var _Logger = require('../lib/Logger');

var _Logger2 = _interopRequireDefault(_Logger);

var _txFormat = require('../lib/txFormat');

var _txFormat2 = _interopRequireDefault(_txFormat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const log = (0, _Logger2.default)('updateTx');

_dataSource2.default.then(db => {
  const Tx = db.collection(_config2.default.blocks.txCollection);
  let n = 0;
  Tx.count().then(total => {
    Tx.find().forEach(tx => {
      n++;
      log.info(`Updating tx ${n} of ${total}`);
      tx = (0, _txFormat2.default)(tx);
      Tx.updateOne({ _id: tx._id }, { $set: tx }).catch(err => log.error(err));
    });
  });
});
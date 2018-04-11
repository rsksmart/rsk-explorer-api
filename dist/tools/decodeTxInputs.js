'use strict';

var _config = require('../lib/config');

var _config2 = _interopRequireDefault(_config);

var _dataSource = require('../lib/dataSource');

var _dataSource2 = _interopRequireDefault(_dataSource);

var _Logger = require('../lib/Logger');

var _Logger2 = _interopRequireDefault(_Logger);

var _txFormat = require('../lib/txFormat');

var _txFormat2 = _interopRequireDefault(_txFormat);

var _web = require('web3');

var _web2 = _interopRequireDefault(_web);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const web3 = new _web2.default();
const log = (0, _Logger2.default)('updateTx');

_dataSource2.default.then(db => {
  const Tx = db.collection(_config2.default.blocks.txCollection);
  let n = 0;
  let query = { to: '0x0000000000000000000000000000000000000000' };
  Tx.count(query).then(total => {
    log.debug(`Txs matched ${total}`);
    if (!total) return;
    Tx.find(query).forEach(tx => {
      n++;
      log.info(`Updating tx ${n} of ${total}`);
      let input = web3.toAscii(tx.input);
      console.log(input);
      // tx = txFormat(tx)
      // Tx.updateOne({ _id: tx._id }, { $set: tx }).catch((err) => log.error(err))
    });
  });
});
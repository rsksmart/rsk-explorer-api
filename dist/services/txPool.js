'use strict';var _dataSource = require('../lib/dataSource');
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _TxPool = require('./classes/TxPool');
var _Logger = require('../lib/Logger');var _Logger2 = _interopRequireDefault(_Logger);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const config = Object.assign({}, _config2.default.blocks);
const log = (0, _Logger2.default)('Blocks', config.log);
_dataSource.dataBase.setLogger(log);

_dataSource.dataBase.db().then(db => {
  config.Logger = log;
  const txPool = new _TxPool.TxPool(db, config);
  log.info(`Starting txPool`);
  txPool.start();
});

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
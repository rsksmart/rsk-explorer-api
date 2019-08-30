"use strict";var _dataSource = require("../lib/dataSource");
var _config = _interopRequireDefault(require("../lib/config"));
var _TxPool = require("./classes/TxPool");
var _Logger = _interopRequireDefault(require("../lib/Logger"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const config = Object.assign({}, _config.default.blocks);
const log = (0, _Logger.default)('Blocks', config.log);

(0, _dataSource.setup)({ log }).then(({ db }) => {
  config.log = log;
  const txPool = new _TxPool.TxPool(db, config);
  log.info(`Starting txPool`);
  txPool.start();
});

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
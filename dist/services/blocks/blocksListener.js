'use strict';var _dataSource = require('../../lib/dataSource.js');
var _config = require('../../lib/config');var _config2 = _interopRequireDefault(_config);
var _ListenBlocks = require('../classes/ListenBlocks');
var _Logger = require('../../lib/Logger');var _Logger2 = _interopRequireDefault(_Logger);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const config = Object.assign({}, _config2.default.blocks);
const log = (0, _Logger2.default)('Blocks', config.log);
_dataSource.dataBase.setLogger(log);

_dataSource.dataBase.db().then(db => {
  config.Logger = log;
  const listener = new _ListenBlocks.ListenBlocks(db, config);
  log.info(`Starting blocks listener`);
  listener.start();
});

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
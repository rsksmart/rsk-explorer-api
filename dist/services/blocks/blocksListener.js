"use strict";var _dataSource = require("../../lib/dataSource.js");
var _config = _interopRequireDefault(require("../../lib/config"));
var _ListenBlocks = require("../classes/ListenBlocks");
var _Logger = _interopRequireDefault(require("../../lib/Logger"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const config = Object.assign({}, _config.default.blocks);
const log = (0, _Logger.default)('Blocks', config.log);

(0, _dataSource.setup)({ log }).then(({ db }) => {
  config.Logger = log;
  const listener = new _ListenBlocks.ListenBlocks(db, { log });
  log.info(`Starting blocks listener`);
  listener.start();
});

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
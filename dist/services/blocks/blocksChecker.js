"use strict";var _dataSource = require("../../lib/dataSource.js");
var _types = require("../../lib/types");
var _CheckBlocks = require("../classes/CheckBlocks");
var _config = _interopRequireDefault(require("../../lib/config"));
var _Logger = _interopRequireDefault(require("../../lib/Logger"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const log = (0, _Logger.default)('Blocks', _config.default.blocks.log);

(0, _dataSource.dataSource)().then(({ db }) => {
  const Checker = new _CheckBlocks.CheckBlocks(db, { log });
  Checker.start();
  process.on('message', msg => {
    let action = msg.action;
    let args = msg.args;
    if (action) {
      switch (action) {
        case _types.actions.CHECK_DB:
          Checker.checkDb(...args);
          break;

        case _types.actions.UPDATE_TIP_BLOCK:
          Checker.updateTipBlock(...args);
          break;}

    }
  });
});

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
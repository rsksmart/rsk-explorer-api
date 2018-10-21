'use strict';var _dataSource = require('../../lib/dataSource.js');
var _types = require('../../lib/types');
var _CheckBlocks = require('../classes/CheckBlocks');
var _config = require('../../lib/config');var _config2 = _interopRequireDefault(_config);
var _Logger = require('../../lib/Logger');var _Logger2 = _interopRequireDefault(_Logger);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const options = Object.assign({}, _config2.default.blocks);
const log = (0, _Logger2.default)('Blocks', options.log);
options.Logger = log;

_dataSource.dataSource.then(db => {
  const Checker = new _CheckBlocks.CheckBlocks(db, options);
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
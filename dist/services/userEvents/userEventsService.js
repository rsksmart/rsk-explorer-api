'use strict';var _dataSource = require('../../lib/dataSource.js');var _dataSource2 = _interopRequireDefault(_dataSource);
var _blocksCollections = require('../../lib/blocksCollections');
var _config = require('../../lib/config');var _config2 = _interopRequireDefault(_config);

var _Logger = require('../../lib/Logger');var _Logger2 = _interopRequireDefault(_Logger);

var _utils = require('../../lib/utils');
var _RequestCache = require('./RequestCache');
var _updateAddress = require('./updateAddress');var _updateAddress2 = _interopRequireDefault(_updateAddress);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const config = Object.assign({}, _config2.default.blocks);
const log = (0, _Logger2.default)('UserRequests', config.log);

_dataSource2.default.then(db => {
  const collections = (0, _blocksCollections.getDbBlocksCollections)(db);
  const cache = new _RequestCache.RequestCache();
  process.on('message', async msg => {
    let { action, params, block } = msg;

    if (action && params && block) {
      switch (action) {
        case 'updateAddress':
          msg = await (0, _updateAddress2.default)({ collections, cache, msg, log }, params);
          sendMessage(msg);
          break;}

    }
  });
});

const sendMessage = msg => {
  process.send((0, _utils.serialize)(msg));
};
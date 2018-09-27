'use strict';var _dataSource = require('../../lib/dataSource.js');
var _config = require('../../lib/config');var _config2 = _interopRequireDefault(_config);
var _collections = require('../../lib/collections.js');var _collections2 = _interopRequireDefault(_collections);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

_dataSource.dataBase.db().then(async db => {
  try {
    let options = { dropIndexes: true, names: _config2.default.blocks.collections };
    console.log('Updating indexes');
    await _dataSource.dataBase.createCollections(_collections2.default, options);
  } catch (err) {
    console.error(err);
  }
});

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
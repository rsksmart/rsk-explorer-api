'use strict';

var _db = require('../../lib/db.js');

var _db2 = _interopRequireDefault(_db);

var _config = require('../../../config');

var _config2 = _interopRequireDefault(_config);

var _saveBlocksClass = require('./saveBlocksClass');

var _saveBlocksClass2 = _interopRequireDefault(_saveBlocksClass);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const config = Object.assign({}, _config2.default.blocks);

_db2.default.then(db => {
  console.log('Using configuration:');
  console.log(config);
  const collection = db.collection(config.blockCollection);
  collection.createIndexes([{
    key: { number: 1 },
    unique: true
  }]).then(doc => {
    if (doc.ok) {
      const exporter = new _saveBlocksClass2.default(config, collection);
      exporter.grabBlocks();
    } else {
      console.log('Error creating collection indexes');
    }
  });
});

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
'use strict';var _dataSource = require('../../lib/dataSource.js');
var _BlocksBase = require('../../lib/BlocksBase');
var _config = require('../../lib/config');var _config2 = _interopRequireDefault(_config);
var _Block = require('../../services/classes/Block');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

_dataSource.dataBase.db().then(async db => {
  let blocks = new Set();
  let options = new _BlocksBase.BlocksBase(db);
  try {
    let collection = db.collection(_config2.default.blocks.collections.Events);
    console.log('getting events');
    let cursor = collection.find({});
    while (await cursor.hasNext()) {
      let event = await cursor.next();
      let { blockHash, blockNumber } = event;
      blocks.add({ blockHash, blockNumber });
    }
    if (blocks.size > 0) {
      console.log(`Deleting ${blocks.size} blocks`);
      await Promise.all([...blocks.values()].
      map(b => (0, _Block.deleteBlockDataFromDb)(b.blockHash, b.blockNumber, options.collections)));
    }
    console.log('DONE');
    process.exit(0);
  } catch (err) {
    console.error(err);
  }
});

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
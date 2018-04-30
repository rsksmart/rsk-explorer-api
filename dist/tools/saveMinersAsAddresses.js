'use strict';

var _config = require('../lib/config');

var _config2 = _interopRequireDefault(_config);

var _dataSource = require('../lib/dataSource');

var _dataSource2 = _interopRequireDefault(_dataSource);

var _Logger = require('../lib/Logger');

var _Logger2 = _interopRequireDefault(_Logger);

var _txFormat = require('../lib/txFormat');

var _txFormat2 = _interopRequireDefault(_txFormat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const log = (0, _Logger2.default)('saveMinnersAsAddresses');

_dataSource2.default.then(db => {
  const Blocks = db.collection(_config2.default.blocks.blocksCollection);
  const Addresses = db.collection(_config2.default.blocks.addrCollection);

  let n = 0;
  Blocks.count().then(total => {
    Blocks.find().forEach(block => {
      n++;
      const address = block.miner;
      log.info(`Block ${n}/${total} Miner: ${address}`);
      Addresses.insertOne({ address, balance: 0 }).catch(err => {
        if (err.code !== 11000) log.error(err);else log.debug(`Dup ${address}`);
      });
    });
  });
});
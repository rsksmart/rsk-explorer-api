'use strict';

var _dataSource = require('../../lib/dataSource.js');

var _dataSource2 = _interopRequireDefault(_dataSource);

var _config = require('../../lib/config');

var _config2 = _interopRequireDefault(_config);

var _Blocks = require('./Blocks');

var _Blocks2 = _interopRequireDefault(_Blocks);

var _Db = require('../../lib/Db');

var dataBase = _interopRequireWildcard(_Db);

var _Logger = require('../../lib/Logger');

var _Logger2 = _interopRequireDefault(_Logger);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const config = Object.assign({}, _config2.default.blocks);
const log = (0, _Logger2.default)('Blocks', config.log);

_dataSource2.default.then(db => {
  log.info('Using configuration:');
  log.info(config);
  config.Logger = log;
  (0, _Blocks2.default)(config, db).then(blocks => {
    blocks.start();
  });
});

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
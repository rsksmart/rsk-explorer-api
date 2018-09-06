'use strict';var _Db = require('../../lib/Db');var dataBase = _interopRequireWildcard(_Db);
var _dataSource = require('../../lib/dataSource.js');var _dataSource2 = _interopRequireDefault(_dataSource);
var _config = require('../../lib/config');var _config2 = _interopRequireDefault(_config);
var _collections = require('../../lib/collections');var _collections2 = _interopRequireDefault(_collections);
var _Blocks = require('./Blocks');
var _Logger = require('../../lib/Logger');var _Logger2 = _interopRequireDefault(_Logger);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}

const config = Object.assign({}, _config2.default.blocks);
const log = (0, _Logger2.default)('Blocks', config.log);

_dataSource2.default.then(db => {
  log.info(`Using configuration: ${JSON.stringify(config)}`);
  config.Logger = log;
  createBlocks(config, db).
  then(blocks => {
    log.info(`Starting blocks service`);
    blocks.start();
  });
});

function createBlocks(config, db) {
  let queue = [];
  let log = config.Logger || console;
  for (let c in _collections2.default) {
    let name = config[c] || c;
    queue.push(dataBase.createCollection(db, name, _collections2.default[c]).
    then(collection => {
      log.info(`Created collection ${name}`);
      return collection;
    }).
    catch(err => {
      log.error(`Error creating collection ${name} ${err}`);
      return Promise.reject(err);
    }));

  }
  return Promise.all(queue).then(dbCollections => {
    let collections = {};
    Object.keys(_collections2.default).forEach((k, i) => {
      collections[k] = dbCollections[i];
    });
    return new _Blocks.SaveBlocks(config, collections);
  }).catch(err => {
    log.error('Error creating collections');
    log.error(err);
    process.exit(9);
  });
}

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});
'use strict';var _path = require('path');var _path2 = _interopRequireDefault(_path);
var _child_process = require('child_process');
var _dataSource = require('../../lib/dataSource.js');
var _config = require('../../lib/config');var _config2 = _interopRequireDefault(_config);
var _collections = require('../../lib/collections');var _collections2 = _interopRequireDefault(_collections);
var _Logger = require('../../lib/Logger');var _Logger2 = _interopRequireDefault(_Logger);
var _BlocksStatus = require('../classes/BlocksStatus');
var _types = require('../../lib/types');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const config = Object.assign({}, _config2.default.blocks);
const log = (0, _Logger2.default)('Blocks', config.log);
config.Logger = log;
_dataSource.dataBase.setLogger(log);

function startService(name, parseMessage, script) {
  script = script || `blocks${name}.js`;
  let service = (0, _child_process.fork)(_path2.default.resolve(__dirname, script));
  service.on('message', msg => parseMessage(msg, name));
  service.on('error', err => {console.error('Service error', err);});
  return service;
}

_dataSource.dataBase.db().then(db => {
  createBlocksCollections(config, db).then(() => {
    const Status = new _BlocksStatus.BlocksStatus(db, config);
    const listenToMessage = (msg, service) => {
      let action, args, event, data;
      ({ action, args, event, data } = msg);
      if (event) {
        readEvent(event, data);
      }
      if (action) {
        switch (action) {
          case _types.actions.STATUS_UPDATE:
            Status.update(...args);
            break;

          case _types.actions.BLOCK_REQUEST:
          case _types.actions.BULK_BLOCKS_REQUEST:
            Requester.send({ action, args });
            break;

          case _types.actions.UPDATE_TIP_BLOCK:
            Checker.send({ action, args });
            break;}

      }
    };
    /* eslint-disable-next-line no-unused-vars */
    const Listener = startService('Listener', listenToMessage);
    const Checker = startService('Checker', listenToMessage);
    const Requester = startService('Requester', listenToMessage);
    /* eslint-disable-next-line no-unused-vars */
    const TxPool = startService('TxPool', listenToMessage, '../txPool.js');
  });
});

// WIP
const readEvent = (event, data) => {
  console.log(event, data);
};

async function createBlocksCollections(config, db) {
  try {
    let names = config.collections;
    let validate = config.validateCollections;
    let options = { names, validate };
    await _dataSource.dataBase.createCollections(_collections2.default, options);
  } catch (err) {
    log.error('Error creating blocks');
    log.error(err);
    process.exit(9);
  }
}

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});

process.on('uncaughtException', err => {
  console.error(err);
});
"use strict";var _path = _interopRequireDefault(require("path"));
var _child_process = require("child_process");
var _config = _interopRequireDefault(require("../../lib/config"));
var _Logger = _interopRequireDefault(require("../../lib/Logger"));
var _BlocksStatus = require("../classes/BlocksStatus");
var _BcStats = require("../classes/BcStats");
var _types = require("../../lib/types");
var _Setup = _interopRequireDefault(require("../../lib/Setup"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const config = Object.assign({}, _config.default.blocks);
const log = (0, _Logger.default)('Blocks', config.log);
config.log = log;

startBlocks();

async function startBlocks() {
  const setup = await (0, _Setup.default)({ log });
  await setup.createCollections();
  const { db, initConfig } = await setup.start();
  config.initConfig = initConfig;
  const Status = new _BlocksStatus.BlocksStatus(db, config);
  const Stats = new _BcStats.BcStats(db, config);
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
          Stats.update(...args);
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
}

function startService(name, parseMessage, script) {
  script = script || `blocks${name}.js`;
  let service = (0, _child_process.fork)(_path.default.resolve(__dirname, script));
  service.on('message', msg => parseMessage(msg, name));
  service.on('error', err => {console.error('Service error', err);});
  return service;
}

// WIP
const readEvent = (event, data) => {
  log.info(event, data);
};

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});

process.on('uncaughtException', err => {
  console.error(err);
});
'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.isDeployment = exports.eventId = exports.getTxOrEventId = exports.txFormat = exports.cfg = undefined;var _config = require('./config');var _config2 = _interopRequireDefault(_config);
var _utils = require('./utils');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const cfg = exports.cfg = _config2.default.publicSettings;

const txFormat = exports.txFormat = tx => {
  tx.txType = cfg.txTypes.default;
  const receipt = tx.receipt || {};
  if (tx.to === cfg.remascAddress) tx.txType = cfg.txTypes.remasc;
  if (tx.to === cfg.bridgeAddress) tx.txType = cfg.txTypes.bridge;
  if ((0, _utils.isAddress)(receipt.contractAddress)) tx.txType = cfg.txTypes.contract;
  tx._id = getTxOrEventId(tx);
  return tx;
};

const checkNumbers = payload => {
  for (let name in payload) {
    let number = payload[name];
    if (isNaN(number)) throw new Error(`${name} is not a number`);
  }
};

const getTxOrEventId = exports.getTxOrEventId = ({ blockNumber, transactionIndex, blockHash, logIndex }) => {
  try {
    checkNumbers({ blockNumber, transactionIndex });
    if (!(0, _utils.isBlockHash)(blockHash)) throw new Error('blockHash is not a block hash');

    let block = blockNumber.toString(16).padStart(7, 0);
    let txI = transactionIndex.toString(16).padStart(3, 0);
    let hash = blockHash.substr(-19, 19);
    let id = `${block}${txI}`;
    if (undefined !== logIndex) {
      if (logIndex) checkNumbers({ logIndex });
      id += logIndex.toString(16).padStart(3, 0);
    }
    id = `${id}${hash}`;
    return id;
  } catch (err) {
    return err;
  }
};

const eventId = exports.eventId = event => {
  let id = getTxOrEventId(event);
  return id;
};

const isDeployment = exports.isDeployment = tx => txFormat(tx).txType === cfg.txTypes.contract;exports.default =

txFormat;
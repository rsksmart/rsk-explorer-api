'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.txFormat = exports.cfg = undefined;var _config = require('./config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const cfg = exports.cfg = _config2.default.publicSettings;

const txFormat = exports.txFormat = tx => {
  tx.txType = cfg.txTypes.default;
  const receipt = tx.receipt || {};
  if (tx.to === cfg.remascAddress) tx.txType = cfg.txTypes.remasc;
  if (tx.to === cfg.bridgeAddress) tx.txType = cfg.txTypes.bridge;
  if (receipt.contractAddress) tx.txType = cfg.txTypes.contract;
  return tx;
};exports.default =

txFormat;
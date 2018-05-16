'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (tx) {
  tx.txType = cfg.txTypes.default;
  if (tx.to == cfg.remascAddress) tx.txType = cfg.txTypes.remasc;
  if (tx.to == cfg.bridgeAddress) tx.txType = cfg.txTypes.bridge;
  if (tx.to == cfg.contractDeployAddress) tx.txType = cfg.txTypes.contract;
  return tx;
};

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const cfg = _config2.default.publicSettings;
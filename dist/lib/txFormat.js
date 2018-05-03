'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (tx) {
  tx.txType = 'normal';
  if (tx.to == _config2.default.remascAddress) tx.txType = 'remasc';
  if (tx.to == _config2.default.bridgeAddress) tx.txType = 'bridge';
  if (tx.to == _config2.default.contractDeployAddress) tx.txType = 'contract deploy';
  return tx;
};

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
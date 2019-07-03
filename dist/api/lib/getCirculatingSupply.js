'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _config = require('../../lib/config');var _config2 = _interopRequireDefault(_config);
var _types = require('../../lib/types');
var _utils = require('../../lib/utils');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const { bridgeAddress } = _config2.default;exports.default =

async function (collection) {
  try {
    const result = await collection.findOne({ address: bridgeAddress });
    if (!result) throw new Error('Missing bridge account from db');
    let { balance, decimals } = result;
    decimals = decimals || 18;
    const bridgeBalance = (0, _utils.applyDecimals)(balance, decimals).toString(10);
    let circulatingSupply = (0, _utils.bigNumberDifference)(_types.TOTAL_SUPPLY, bridgeBalance).toString(10);
    return { circulatingSupply, totalSupply: _types.TOTAL_SUPPLY, bridgeBalance };
  } catch (err) {
    return Promise.reject(err);
  }
};
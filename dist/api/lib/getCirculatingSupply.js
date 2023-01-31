"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = _default;var _types = require("../../lib/types");
var _utils = require("../../lib/utils");
var _address = require("../../repositories/address.repository");

async function _default(collection, { bridge }) {
  try {
    const query = { address: bridge };
    const result = await _address.addressRepository.findOne(query, {}, collection);
    if (!result) throw new Error('Missing bridge account from db');
    let { balance, decimals } = result;
    decimals = decimals || 18;
    const bridgeBalance = (0, _utils.applyDecimals)(balance, decimals).toString(10);
    let circulatingSupply = (0, _utils.bigNumberDifference)(_types.TOTAL_SUPPLY, bridgeBalance).toString(10);
    return { circulatingSupply, totalSupply: _types.TOTAL_SUPPLY, bridgeBalance };
  } catch (err) {
    return Promise.reject(err);
  }
}
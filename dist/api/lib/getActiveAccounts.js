"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = getActiveAccounts;var _types = require("../../lib/types");
var _address = require("../../repositories/address.repository");

async function getActiveAccounts(collections) {
  try {
    let collection = collections.Addrs;
    let type = _types.addrTypes.ADDRESS;
    let query = { $and: [{ type }, { balance: { $ne: '0x0' } }, { balance: { $ne: '0' } }] };
    let result = await _address.addressRepository.countDocuments(query, collection);
    return result;
  } catch (err) {
    return Promise.reject(err);
  }
}
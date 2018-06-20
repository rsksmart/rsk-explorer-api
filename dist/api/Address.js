'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Address = undefined;var _DataCollector = require('../lib/DataCollector');
var _types = require('../lib/types');

class Address extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.sort = { address: 1 };
    this.publicActions = {

      getAddress: params => {
        const address = params.address;
        return this.getOne({ address });
      },

      getAddresses: params => {
        return this.getPageData({}, params);
      },

      getTokens: params => {
        return this.getPageData({
          type: _types.addrTypes.CONTRACT,
          contractType: _types.contractsTypes.ERC20 },
        params);
      } };

  }}exports.Address = Address;exports.default =


Address;
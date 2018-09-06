'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Address = undefined;var _DataCollector = require('../lib/DataCollector');
var _types = require('../lib/types');
var _getBalanceFromTxs = require('./getBalanceFromTxs');

class Address extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.sort = { address: 1 };
    this.Tx = this.parent.getItem({ key: 'Tx' });
    this.getBalanceFromTxs = (0, _getBalanceFromTxs.GetTxBalance)(this.parent.getItem({ key: 'Tx' }));
    this.publicActions = {
      getAddress: async params => {
        const address = params.address;
        const addressData = await this.getOne({ address });
        if (addressData.data) {
          const txBalance = await this.getBalanceFromTxs(address);
          if (txBalance) addressData.data.txBalance = txBalance;
        }
        return addressData;
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
'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.TokenAccount = undefined;var _DataCollector = require('../lib/DataCollector');

class TokenAccount extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.sort = { address: 1 };
    this.publicActions = {

      getTokenAccounts: async params => {
        const contract = params.contract;
        const data = await this.getPageData({ contract }, params);
        return this.parent.getAddress(params.address, data);
      },

      getTokenAccount: async params => {
        const address = params.address;
        const contract = params.contract;
        const data = await this.getOne({ address, contract });
        return this.parent.getAddress(address, data);
      } };

  }}exports.TokenAccount = TokenAccount;exports.default =


TokenAccount;
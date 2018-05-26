'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.TokenAccount = undefined;var _DataCollector = require('../lib/DataCollector');

class TokenAccount extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.sort = { address: 1 };
    this.publicActions = {

      getTokenAccounts: async params => {
        const data = await this.getPages(params);
        return this.parent.getAddress(params.address, data);
      },

      getTokenAccount: async params => {
        const query = { address: params.address, contract: params.contract };
        const data = await this.getOne(query);
        return this.parent.getAddress(params.address, data);
      } };

  }}exports.TokenAccount = TokenAccount;exports.default =


TokenAccount;
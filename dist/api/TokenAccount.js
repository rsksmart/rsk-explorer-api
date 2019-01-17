'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.TokenAccount = undefined;var _DataCollector = require('../lib/DataCollector');

class TokenAccount extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.sort = { address: 1 };
    this.publicActions = {

      getTokenAccounts: params => {
        const contract = params.contract || params.address;
        if (contract) return this.getPageData({ contract }, params);
      },

      getTokensByAddress: async params => {
        const address = params.address;
        const from = this.parent.Address.db.collectionName;
        if (address) {
          let aggregate = [
          {
            $lookup: { from, localField: 'contract', foreignField: 'address', as: 'addressesItems' } },

          { $replaceRoot: { newRoot: { $mergeObjects: [{ $arrayElemAt: ['$addressesItems', 0] }, '$$ROOT'] } } },
          { $project: { addressesItems: 0 } },
          {
            $match: { address } }];


          let data = await this.getAggPageData(aggregate, params);
          return data;
        }
      },

      getContractAccount: params => {
        const { address, contract } = params;
        return this.getOne({ address, contract });
      },

      getTokenAccount: async params => {
        const { address, contract } = params;
        const account = await this.getOne({ address, contract });
        return this.parent.addAddressData(contract, account, '_contractData');
      } };

  }}exports.TokenAccount = TokenAccount;exports.default =


TokenAccount;
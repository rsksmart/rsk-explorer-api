'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.TxPending = undefined;var _DataCollector = require('../lib/DataCollector');

class TxPending extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.sort = { timestamp: -1 };
    this.publicActions = {

      getPendingTransaction: params => {
        const hash = params.hash;
        return this.getOne({ hash });
      },

      getPendingTransactionsByAddress: params => {
        let address = params.address;
        return this.getPageData(
        {
          $or: [{ from: address }, { to: address }] },

        params);

      } };

  }}exports.TxPending = TxPending;exports.default =


TxPending;
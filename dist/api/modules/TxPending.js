"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.TxPending = void 0;var _DataCollector = require("../lib/DataCollector");

class TxPending extends _DataCollector.DataCollectorItem {
  constructor(collections, key) {
    const { PendingTxs } = collections;
    super(PendingTxs, key);
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

  }}exports.TxPending = TxPending;var _default =


TxPending;exports.default = _default;
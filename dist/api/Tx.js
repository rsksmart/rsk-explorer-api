'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Tx = undefined;var _DataCollector = require('../lib/DataCollector');
var _utils = require('../lib/utils');

class Tx extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.sort = { blockNumber: -1, transactionIndex: -1 };
    this.publicActions = {

      getTransactions: params => {
        let query = {};
        let txType = params.query ? params.query.txType : null;
        if (txType) {
          query = this.fieldFilterParse('txType', txType);
        }
        return this.getPageData(query, params);
      },

      getTransaction: params => {
        const hash = params.hash;
        const blockNumber = params.block || params.blockNumber;
        const transactionIndex = params.index || params.transactionIndex;
        if (hash) {
          return this.getOne({ hash });
        } else if (undefined !== blockNumber && undefined !== transactionIndex) {
          return this.getOne({ blockNumber, transactionIndex });
        }
      },

      getTransactionsByBlock: params => {
        const hashOrNumber = params.hashOrNumber || params.number;

        if ((0, _utils.isBlockHash)(hashOrNumber)) {
          params.blockHash = hashOrNumber;
          return this.getTransactionsByBlockHash(params);
        } else {
          params.blockNumber = parseInt(hashOrNumber);
          return this.getTransactionsByBlockNumber(params);
        }
      },

      getTransactionsByAddress: params => {
        let address = params.address;
        return this.getPageData(
        {
          $or: [{ from: address }, { to: address }] },

        params);

      } };

  }

  getTransactionsByBlockNumber(params) {
    const blockNumber = parseInt(params.blockNumber || params.number);
    if (undefined !== blockNumber) {
      return this.getPageData({ blockNumber }, params);
    }
  }

  getTransactionsByBlockHash(params) {
    const blockHash = params.blockHash;
    if (blockHash) {
      return this.getPageData({ blockHash }, params);
    }
  }}exports.Tx = Tx;exports.default =


Tx;
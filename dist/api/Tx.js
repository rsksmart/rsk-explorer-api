'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Tx = undefined;var _DataCollector = require('../lib/DataCollector');
var _utils = require('../lib/utils');

class Tx extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    // const sortable = { timestamp: -1 }
    super(collection, key, parent);
    const PendingTxs = this.parent.getItem({ key: 'TxPending' });
    this.PendingTxs = PendingTxs.publicActions;
    this.publicActions = {

      getTransactions: params => {
        let query = {};
        let txType = params.query ? params.query.txType : null;
        if (txType) {
          query = this.fieldFilterParse('txType', txType);
        }
        return this.getPageData(query, params);
      },

      getTransaction: async params => {
        const hash = params.hash;
        if (hash) {
          let tx;
          tx = await this.getPrevNext({ hash }, { hash: 1 });
          if (!tx.data) tx = await this.PendingTxs.getPendingTransaction(params);
          return tx;
        }
      },

      getTransactionWithAddressData: async params => {
        let data = await this.publicActions.getTransaction(params);
        let tx = data.data;
        if (tx) {
          let logs = tx.receipt ? tx.receipt.logs : [];
          let addresses = new Set(logs.map(log => log.address));
          addresses.add(tx.from);
          addresses.add(tx.to);
          let Address = this.parent.Address;
          let res = await Promise.all([...addresses.values()].map(address => Address.run('getAddress', { address })));
          if (res) {
            res = res.reduce((v, a, i) => {
              let d = a.data;
              if (d && d.address) v[d.address] = d;
              return v;
            }, {});

            tx._addresses = res;
          }
          return data;
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
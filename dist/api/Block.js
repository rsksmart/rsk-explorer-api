'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Block = undefined;var _DataCollector = require('../lib/DataCollector');

class Block extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.sort = { number: -1 };
    this.publicActions = {
      getBlock: params => {
        let number = parseInt(params.number);
        if (undefined !== number) {
          return this.getPrevNext(
          params,
          { number: number },
          { number: { $lte: number - 1 } },
          { number: { $lte: number + 1 } },
          this.sort).
          then(block => {
            if (block && block.DATA) {
              return this.parent.Tx.
              run('getBlockTransactions', {
                blockNumber: block.DATA.number }).

              then(txs => {
                block.DATA.transactions = txs.DATA;
                return block;
              });
            }
          });
        }
      },
      getBlocks: params => {
        return this.getPageData({}, params);
      } };

  }}exports.Block = Block;exports.default =


Block;
'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Block = undefined;var _DataCollector = require('../lib/DataCollector');
var _utils = require('../lib/utils');
class Block extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.sort = { number: -1 };
    this.publicActions = {

      getBlock: async params => {
        const hashOrNumber = params.hashOrNumber || params.number;
        if ((0, _utils.isBlockHash)(hashOrNumber)) {
          const block = await this.getOne({ hash: hashOrNumber });
          if (block) return this.getBlockNextPrev(block.DATA.number, params);
        } else {
          const number = parseInt(hashOrNumber);
          return this.getBlockNextPrev(number, params);
        }
      },

      getBlocks: params => {
        return this.getPageData({}, params);
      } };

  }
  getBlockNextPrev(number, params) {
    return this.getPrevNext(
    params,
    { number: number },
    { number: { $lte: number - 1 } },
    { number: { $lte: number + 1 } },
    this.sort);
  }}exports.Block = Block;exports.default =


Block;
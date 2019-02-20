'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Block = undefined;var _DataCollector = require('../lib/DataCollector');
var _utils = require('../lib/utils');
class Block extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    let cursorField = 'number';
    let sortDir = -1;
    let sortable = { timestamp: -1 };
    super(collection, key, parent, { sortDir, cursorField, sortable });
    this.publicActions = {

      getBlock: params => {
        const hashOrNumber = params.hashOrNumber || params.hash || params.number;
        let query = {};
        if ((0, _utils.isBlockHash)(hashOrNumber)) {
          query = { hash: hashOrNumber };
        } else {
          query = { number: parseInt(hashOrNumber) };
        }
        return this.getPrevNext(query, { number: 1 });
      },

      getBlocks: params => {
        return this.getPageData({}, params);
      } };

  }}exports.Block = Block;exports.default =


Block;
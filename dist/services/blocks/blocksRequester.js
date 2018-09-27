'use strict';var _RequestBlocks = require('../classes/RequestBlocks');
var _types = require('../../lib/types');
var _utils = require('../../lib/utils');
var _Block = require('../classes/Block');
var _dataSource = require('../../lib/dataSource');
var _Logger = require('../../lib/Logger');var _Logger2 = _interopRequireDefault(_Logger);
var _config = require('../../lib/config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const options = Object.assign({}, _config2.default.blocks);
const log = (0, _Logger2.default)('Blocks', options.log);
options.Logger = log;

_dataSource.dataSource.then(db => {
  let Requester = new _RequestBlocks.RequestBlocks(db, options);
  const blocksCollection = Requester.collections.Blocks;
  Requester.updateStatus = function (state) {
    state = state || {};
    state.requestingBlocks = this.getRequested();
    state.pendingBlocks = this.getPending();
    let action = _types.actions.STATUS_UPDATE;
    process.send({ action, args: [state] });
  };
  process.on('message', msg => {
    let action = msg.action;
    let args = msg.args;
    if (action) {
      switch (action) {

        case _types.actions.BLOCK_REQUEST:
          Requester.request(...args);
          break;

        case _types.actions.BULK_BLOCKS_REQUEST:
          Requester.bulkRequest(...args);
          break;}

    }
  });

  Requester.events.on(_types.events.QUEUE_DONE, data => {
    Requester.updateStatus();
  });

  Requester.events.on(_types.events.BLOCK_REQUESTED, data => {
    log.debug(_types.events.BLOCK_REQUESTED, data);
    Requester.updateStatus();
  });

  Requester.events.on(_types.events.BLOCK_ERROR, data => {
    log.debug(_types.events.BLOCK_ERROR, data);
  });

  Requester.events.on(_types.events.NEW_BLOCK, data => {
    let block = data.block;
    let key = data.key;
    let isHashKey = (0, _utils.isBlockHash)(key);
    if (block) {
      let show = isHashKey ? block.number : block.hash;
      log.debug(_types.events.NEW_BLOCK, `New Block DATA ${key} - ${show}`);
      let parent = block.parentHash;

      (0, _Block.getBlockFromDb)(parent, blocksCollection).then(parentBlock => {
        if (!parentBlock) {
          log.debug(`Getting parent of block ${block.number} - ${parent}`);
          Requester.request(parent, true);
        }
      });
    }
    Requester.updateStatus();
  });
});
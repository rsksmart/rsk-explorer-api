'use strict';var _dataSource = require('../lib/dataSource.js');var _dataSource2 = _interopRequireDefault(_dataSource);
var _blocksCollections = require('../lib/blocksCollections');
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _nod3Connect = require('../lib/nod3Connect');var _nod3Connect2 = _interopRequireDefault(_nod3Connect);
var _Address = require('./classes/Address');var _Address2 = _interopRequireDefault(_Address);
var _Logger = require('../lib/Logger');var _Logger2 = _interopRequireDefault(_Logger);
var _types = require('../lib/types');
var _utils = require('../lib/utils');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const config = Object.assign({}, _config2.default.blocks);
const log = (0, _Logger2.default)('UserRequests', config.log);

_dataSource2.default.then(db => {
  const collections = (0, _blocksCollections.getDbBlocksCollections)(db);
  const cache = new RequestCache();
  process.on('message', msg => {
    let { action, params, block } = msg;
    if (action && params && block) {
      switch (action) {
        case 'updateAddress':
          updateAddress({ collections, cache, msg }, params);
          break;}

    }
  });
});

const updateAddress = async ({ collections, cache, msg }, { address }) => {
  try {
    const { block, action, module } = msg;
    const cached = cache.isRequested(block, [module, action, address]);
    if (cached) {
      msg.data = cached;
      sendMessage(msg);
    } else {
      const Addr = new _Address2.default(address, { nod3: _nod3Connect2.default, collections });
      let result = await Addr.fetch().
      catch(err => {
        log.error(err);
        msg.error = _types.errors.TEMPORARILY_UNAVAILABLE;
        sendMessage(msg);
      });
      msg.result = result;
      cache.set(block, [module, action, address], result);
      const newBalance = result.balance ? result.balance.toString() : 0;
      const dbData = Addr.dbData || {};
      const { balance, txBalance } = dbData;
      if (newBalance > 0 || balance) {
        if (!parseInt(txBalance)) await Addr.updateTxBalance();

        await Addr.save().catch(err => {
          log.error(`Error saving address ${address}, ${err}`);
          sendMessage(msg);
        });
        sendMessage(msg);
      } else {
        msg.data = result;
        sendMessage(msg);
      }
    }
  } catch (err) {
    log.debug(err);
    msg.error = err;
    sendMessage(msg);
  }
};

const sendMessage = msg => {
  process.send((0, _utils.serialize)(msg));
};

class RequestCache {
  constructor() {
    this.requested = {};
    this.block = null;
  }
  set(block, keys, value) {
    this.setBlock(block);
    this.requested[this.makeKey(keys)] = value;
  }
  isRequested(block, keys) {
    this.setBlock(block);
    return this.requested[this.makeKey(keys)];
  }
  setBlock(block) {
    if (block !== this.block) {
      this.block = block;
      this.requested = {};
    }
  }
  makeKey(args) {
    return args.join('-');
  }}
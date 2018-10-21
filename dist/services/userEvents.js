'use strict';var _dataSource = require('../lib/dataSource.js');var _dataSource2 = _interopRequireDefault(_dataSource);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _nod3Connect = require('../lib/nod3Connect');var _nod3Connect2 = _interopRequireDefault(_nod3Connect);
var _Address = require('./classes/Address');var _Address2 = _interopRequireDefault(_Address);
var _Logger = require('../lib/Logger');var _Logger2 = _interopRequireDefault(_Logger);
var _types = require('../lib/types');
var _utils = require('../lib/utils');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const config = Object.assign({}, _config2.default.blocks);
const log = (0, _Logger2.default)('UserRequests', config.log);

_dataSource2.default.then(db => {
  const addressCollection = db.collection(config.collections.Addrs);
  const cache = new RequestCache();
  process.on('message', msg => {
    let { module, action, params, block } = msg;
    if (action && params && block) {
      switch (action) {
        case 'updateAddress':
          try {
            const address = params.address;
            const cached = cache.isRequested(block, [module, action, address]);
            if (cached) {
              msg.data = cached;
              sendMessage(msg);
            } else {
              const Addr = new _Address2.default(address, _nod3Connect2.default, addressCollection);
              Addr.fetch().then(result => {
                msg.result = result;
                cache.set(block, [module, action, address], result);
                const balance = result.balance ? result.balance.toString() : 0;
                const dbBalance = Addr.dbData ? Addr.dbData.balance : null;
                if (balance > 0 || dbBalance) {
                  Addr.save().
                  then(() => {
                    sendMessage(msg);
                  }).
                  catch(err => {
                    log.error(`Error saving address ${address}, ${err}`);
                    sendMessage(msg);
                  });
                } else {
                  msg.data = result;
                  sendMessage(msg);
                }
              }).catch(err => {
                log.error(err);
                msg.error = _types.errors.TEMPORARILY_UNAVAILABLE;
                sendMessage(msg);
              });
            }
          } catch (err) {
            log.debug(err);
            msg.error = err;
            sendMessage(msg);
          }
          break;}

    }
  });
});

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
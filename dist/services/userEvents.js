'use strict';var _dataSource = require('../lib/dataSource.js');var _dataSource2 = _interopRequireDefault(_dataSource);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _web3Connect = require('../lib/web3Connect');var _web3Connect2 = _interopRequireDefault(_web3Connect);
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
    let action, params, block;
    ({ action, params, block } = msg);
    if (action && params && block) {
      switch (action) {
        case 'updateAddress':
          try {
            const address = params.address;
            const cached = cache.isRequested(action, address, block);
            if (cached) {
              msg.data = cached;
              sendMessage(msg);
            } else {
              const Addr = new _Address2.default(address, _web3Connect2.default, addressCollection);
              Addr.fetch().then(result => {
                msg.result = result;
                cache.set(action, address, result, block);
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
  set(action, key, value, block) {
    this.setBlock(block);
    let actions = this.getAction(action);
    actions[key] = value;
    this.requested[action] = actions;
  }
  setBlock(block) {
    if (block !== this.block) {
      this.block = block;
      this.requested = {};
    }
  }
  getAction(action) {
    return this.requested[action] || {};
  }
  isRequested(action, key, block) {
    this.setBlock(block);
    return this.getAction(action)[key];
  }}
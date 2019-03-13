'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.updateAddress = undefined;var _types = require('../../lib/types');
var _nod3Connect = require('../../lib/nod3Connect');var _nod3Connect2 = _interopRequireDefault(_nod3Connect);
var _Address = require('../classes/Address');var _Address2 = _interopRequireDefault(_Address);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const updateAddress = exports.updateAddress = async ({ collections, cache, msg, log }, { address }) => {
  try {
    log = log || console;
    msg = msg || {};
    const { block, action, module } = msg;
    const cached = cache ? cache.isRequested(block, [module, action, address]) : null;
    if (cached) {
      msg.data = cached;
      return msg;
    } else {
      const Addr = new _Address2.default(address, { nod3: _nod3Connect2.default, collections });
      let result = await Addr.fetch().
      catch(err => {
        log.error(err);
        msg.error = _types.errors.TEMPORARILY_UNAVAILABLE;
        return msg;
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
          return msg;
        });
        return msg;
      } else {
        msg.data = result;
        return msg;
      }
    }
  } catch (err) {
    log.debug(err);
    msg.error = err;
    return msg;
  }
};exports.default =

updateAddress;
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.AddressModule = AddressModule;exports.default = void 0;var _types = require("../../lib/types");
var _nod3Connect = _interopRequireDefault(require("../../lib/nod3Connect"));
var _Address = _interopRequireDefault(require("../classes/Address"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

function AddressModule({ db, collections, initConfig, log }) {
  log = log || console;

  const updateAddress = async ({ msg, cache }, { address }) => {
    try {
      msg = msg || {};
      const { block, action, module } = msg;
      const cached = cache ? cache.isRequested(block, [module, action, address]) : null;
      if (cached) {
        msg.data = cached;
        return msg;
      } else {
        const Addr = new _Address.default(address, { initConfig, nod3: _nod3Connect.default, collections });
        let result = await Addr.fetch().catch(err => {
          log.error(err);
          msg.error = _types.errors.TEMPORARILY_UNAVAILABLE;
          return msg;
        });
        msg.result = result;
        cache.set(block, [module, action, address], result);
        const newBalance = result.balance ? result.balance.toString() : 0;
        const dbData = Addr.dbData || {};
        const { balance, txBalance } = dbData;
        const code = dbData.code || Addr.data.code;
        if (newBalance > 0 || balance || code) {
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
  };
  return Object.freeze({ updateAddress });
}var _default =

AddressModule;exports.default = _default;
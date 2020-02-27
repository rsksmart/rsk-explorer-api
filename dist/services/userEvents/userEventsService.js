"use strict";var _dataSource = _interopRequireDefault(require("../../lib/dataSource.js"));
var _blocksCollections = require("../../lib/blocksCollections");
var _config = _interopRequireDefault(require("../../lib/config"));
var _Logger = _interopRequireDefault(require("../../lib/Logger"));
var _utils = require("../../lib/utils");
var _RequestCache = require("./RequestCache");
var _AddressModule = _interopRequireDefault(require("./AddressModule"));
var _ContractVerifierModule = _interopRequireDefault(require("./ContractVerifierModule"));
var _types = require("../../lib/types");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const log = (0, _Logger.default)('UserRequests', _config.default.blocks.log);
const verifierConfig = _config.default.api.contractVerifier;

(0, _dataSource.default)({ log, skipCheck: true }).then(({ db, initConfig }) => {
  const collections = (0, _blocksCollections.getDbBlocksCollections)(db);
  const cache = new _RequestCache.RequestCache();
  // TODO, conditional creation
  const verifierModule = (0, _ContractVerifierModule.default)(db, collections, verifierConfig, { log });
  const addressModule = (0, _AddressModule.default)({ db, collections, initConfig, log });

  process.on('message', async msg => {
    try {
      let { action, params, block, module } = msg;
      if (module && action) {
        switch (module) {
          // Address module
          case 'Address':
            if (action === 'updateAddress') {
              if (!block) return;
              msg = await addressModule.updateAddress({ cache, msg }, params);
              sendMessage(msg);
            }
            break;
          // Contract Verifier module
          case 'ContractVerification':
            const method = verifierModule[action];
            if (!method) throw new Error(`Unknow action ${action}`);
            try {
              msg = await method(msg);
              sendMessage(msg);
            } catch (err) {
              log.debug(err);
              msg.error = _types.errors.TEMPORARILY_UNAVAILABLE;
              sendMessage(msg);
              throw err;
            }
            break;}

      }
    } catch (err) {
      log.error(err);
    }
  });
});

const sendMessage = msg => {
  process.send((0, _utils.serialize)(msg));
};
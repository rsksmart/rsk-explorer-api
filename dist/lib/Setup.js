"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getNetInfo = getNetInfo;exports.Setup = Setup;exports.default = exports.dataBase = void 0;var _collections = _interopRequireDefault(require("./collections"));
var _config = _interopRequireDefault(require("./config"));
var _Db = _interopRequireDefault(require("./Db.js"));
var _StoredConfig = require("./StoredConfig");
var _nod3Connect = _interopRequireDefault(require("./nod3Connect"));
var _initialConfiguration = _interopRequireDefault(require("./initialConfiguration"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const dataBase = new _Db.default(_config.default.db);exports.dataBase = dataBase;

async function getNetInfo(nod3) {
  try {
    let net = await nod3.net.version();
    return net;
  } catch (err) {
    return Promise.reject(err);
  }
}

async function Setup({ log } = {}) {
  log = log || console;
  dataBase.setLogger(log);
  const db = await dataBase.db();
  const storedConfig = (0, _StoredConfig.StoredConfig)(db);

  const createCollections = async () => {
    const names = _config.default.collectionsNames;
    const validate = _config.default.blocks.validateCollections;
    return dataBase.createCollections(_collections.default, { names, validate });
  };

  const getInitConfig = async () => {
    try {
      await _nod3Connect.default.isConnected().catch(err => {
        log.debug(err);
        throw new Error(`Cannot connect to the node`);
      });
      const net = await getNetInfo(_nod3Connect.default);
      return Object.assign(_initialConfiguration.default, { net });
    } catch (err) {
      return Promise.reject(err);
    }
  };

  const checkSetup = async () => {
    try {
      const current = await getInitConfig();
      let stored = await storedConfig.getConfig();
      if (!stored) {
        log.info(`Saving initial configuration to db`);
        await storedConfig.saveConfig(current);
        return checkSetup();
      }
      if (stored.net.id !== current.net.id) {
        throw new Error(`Network stored id (${stored.net.id}) is not equal to node network id (${current.net.id})`);
      }
      return stored;
    } catch (err) {
      return Promise.reject(err);
    }
  };

  const start = async skipCheck => {
    try {
      let initConfig;
      if (skipCheck) initConfig = await storedConfig.getConfig();else
      initConfig = await checkSetup();
      if (!initConfig) throw new Error(`invalid init config, run checkSetup first`);
      return { initConfig, db };
    } catch (err) {
      log.error(err);
      process.exit(9);
    }
  };
  return Object.freeze({ start, createCollections, checkSetup, getInitConfig });
}var _default =

Setup;exports.default = _default;
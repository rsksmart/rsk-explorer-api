"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.networkError = networkError;exports.getNetInfo = getNetInfo;exports.Setup = Setup;exports.default = exports.CONFIG_ID = exports.COLLECTIONS_ID = exports.INIT_ID = void 0;var _collections = _interopRequireDefault(require("./collections"));
var _config = require("./config");
var _Db = _interopRequireDefault(require("./Db.js"));
var _StoredConfig = require("./StoredConfig");
var _nod3Connect = require("./nod3Connect");
var _initialConfiguration = _interopRequireDefault(require("./initialConfiguration"));
var _blocksCollections = require("./blocksCollections");
var _utils = require("./utils");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const INIT_ID = '_explorerInitialConfiguration';exports.INIT_ID = INIT_ID;
const COLLECTIONS_ID = '_explorerCollections';exports.COLLECTIONS_ID = COLLECTIONS_ID;
const CONFIG_ID = '_explorerConfig';exports.CONFIG_ID = CONFIG_ID;

const readOnlyDocsIds = [INIT_ID];

function networkError(storedInitConfig, initConfig) {
  return `Network stored id (${storedInitConfig.net.id}) is not equal to node network id (${initConfig.net.id})`;
}

async function getNetInfo(nod3) {
  try {
    let net = await nod3.net.version();
    return net;
  } catch (err) {
    return Promise.reject(err);
  }
}

const defaultInstances = { nod3: _nod3Connect.nod3, config: _config.config, collections: _collections.default };

async function Setup({ log } = {}, { nod3, config, collections } = defaultInstances) {
  const database = new _Db.default(config.db);
  if (undefined !== log) database.setLogger(log);
  log = database.getLogger();
  const db = await database.db();
  const storedConfig = (0, _StoredConfig.StoredConfig)(db, readOnlyDocsIds);

  const createHash = thing => (0, _utils.hash)(thing, 'sha1', 'hex');

  const createCollections = async names => {
    names = names || config.collectionsNames;
    const validate = config.blocks.validateCollections;
    return database.createCollections(collections, { names, validate });
  };

  const getInitConfig = async () => {
    try {
      await nod3.isConnected().catch(err => {
        log.debug(err);
        throw new Error(`Cannot connect to the node`);
      });
      const net = await getNetInfo(nod3);
      return Object.assign(_initialConfiguration.default, { net });
    } catch (err) {
      return Promise.reject(err);
    }
  };

  const checkStoredHash = async (id, value) => {
    if (!id || !value) throw new Error(`Invalid id or value id:${id} value:${value}`);
    const currentHash = createHash(value);
    const storedHash = await storedConfig.get(id);
    if (!storedHash) return false;
    return currentHash === storedHash.hash;
  };

  const checkConfig = async () => {
    const testConfig = await checkStoredHash(CONFIG_ID, config);
    const testCollections = await checkStoredHash(COLLECTIONS_ID, collections);
    return !!(testConfig && testCollections);
  };

  const saveConfig = async () => {
    try {
      await storedConfig.update(CONFIG_ID, { hash: createHash(config) }, { create: true });
      await storedConfig.update(COLLECTIONS_ID, { hash: createHash(collections) }, { create: true });
    } catch (err) {
      return Promise.reject(err);
    }
  };

  const checkSetup = async () => {
    try {
      const initConfig = await getInitConfig();
      const storedInitConfig = await storedConfig.get(INIT_ID);
      const configMatches = await checkConfig();
      if (!storedInitConfig || !configMatches) {
        await createCollections();
        await saveConfig();
        if (!storedInitConfig) {
          log.info(`Saving initial configuration to db`);
          await storedConfig.save(INIT_ID, initConfig);
          return checkSetup();
        }
      }
      if (storedInitConfig.net.id !== initConfig.net.id) {
        throw new Error(networkError(storedInitConfig, initConfig));
      }
      return storedInitConfig;
    } catch (err) {
      return Promise.reject(err);
    }
  };

  const getCollections = db => {
    return (0, _blocksCollections.getDbBlocksCollections)(db);
  };

  const start = async skipCheck => {
    try {
      let initConfig;
      if (skipCheck) initConfig = await storedConfig.get(INIT_ID);else
      initConfig = await checkSetup();
      if (!initConfig) throw new Error(`invalid init config, run checkSetup first`);
      const collections = await getCollections(db);
      return { initConfig, db, collections };
    } catch (err) {
      log.error(err);
      return Promise.reject(err);
    }
  };

  return Object.freeze({ start, createHash });
}var _default =

Setup;exports.default = _default;
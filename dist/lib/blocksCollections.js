"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.blocksCollections = exports.getDbBlocksCollections = void 0;var _config = _interopRequireDefault(require("./config"));
var _dataSource = require("./dataSource");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const getDbBlocksCollections = (db, names) => {
  names = names || _config.default.collectionsNames;
  let collections = {};
  for (let n in names) {
    collections[n] = db.collection(names[n]);
  }
  return collections;
};exports.getDbBlocksCollections = getDbBlocksCollections;

const blocksCollections = async () => {
  try {
    let { db } = await (0, _dataSource.setup)();
    return getDbBlocksCollections(db);
  } catch (err) {
    console.log(`Error getting collections ${err}`);
    console.log(err);
    process.exit(9);
  }
};exports.blocksCollections = blocksCollections;var _default =

blocksCollections;exports.default = _default;
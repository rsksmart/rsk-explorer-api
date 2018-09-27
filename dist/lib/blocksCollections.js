'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.blocksCollections = exports.getDbBlocksCollections = undefined;var _config = require('./config');var _config2 = _interopRequireDefault(_config);
var _dataSource = require('./dataSource');var _dataSource2 = _interopRequireDefault(_dataSource);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const getDbBlocksCollections = exports.getDbBlocksCollections = (db, names) => {
  names = names || _config2.default.blocks.collections;
  let collections = {};
  for (let n in names) {
    collections[n] = db.collection(names[n]);
  }
  return collections;
};

const blocksCollections = exports.blocksCollections = async () => {
  try {
    let db = await _dataSource2.default;
    return getDbBlocksCollections(db);
  } catch (err) {
    console.log(err);
    process.exit(9);
  }
};exports.default =

blocksCollections;
"use strict";var _config = _interopRequireDefault(require("../lib/config"));
var _backupCollections = _interopRequireDefault(require("./backupCollections.json"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const what = process.argv[2];

let res;
try {
  if (what === 'dbName') res = getDbName();
  if (what === 'collections') res = getCollections();
  if (!res) throw new Error('Empty result');
  console.log(res);
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(9);
}

function getDbName() {
  const dbName = _config.default.db.database;
  if (!dbName) throw new Error(`Invalid db Name ${dbName}`);
  return dbName;
}

function getCollections() {
  const { collectionsNames } = _config.default;
  return Object.entries(collectionsNames).
  filter(([coll, name]) => _backupCollections.default.includes(coll)).
  map(([coll, name]) => name).
  join(',');
}
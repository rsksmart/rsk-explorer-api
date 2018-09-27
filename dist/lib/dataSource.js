'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.dataSource = exports.dataBase = undefined;var _Db = require('./Db.js');var _Db2 = _interopRequireDefault(_Db);
var _config = require('./config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const dataBase = exports.dataBase = new _Db2.default(_config2.default.db);
const dataSource = exports.dataSource = dataBase.db();exports.default =
dataSource;
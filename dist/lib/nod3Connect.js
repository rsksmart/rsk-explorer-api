'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.nod3 = exports.nod3Connect = undefined;var _nod = require('nod3');var _nod2 = _interopRequireDefault(_nod);
var _config = require('./config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const url = _config2.default.source.url;

const nod3Connect = exports.nod3Connect = url => {
  return new _nod2.default(
  new _nod2.default.providers.HttpProvider(url));

};

const nod3 = exports.nod3 = nod3Connect(url);exports.default =

nod3;
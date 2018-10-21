'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.web3 = exports.web3Connect = undefined;var _web = require('web3');var _web2 = _interopRequireDefault(_web);
var _config = require('./config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const url = _config2.default.source.url;

const web3Connect = exports.web3Connect = url => {
  return new _web2.default(
  new _web2.default.providers.HttpProvider(url));

};

const web3 = exports.web3 = web3Connect(url);exports.default =

web3;
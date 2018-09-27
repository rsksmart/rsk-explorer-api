'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.web3 = exports.web3Connect = undefined;var _web = require('web3');var _web2 = _interopRequireDefault(_web);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const node = _config2.default.source.node;
const port = _config2.default.source.port;

const web3Connect = exports.web3Connect = (node, port) => {
  return new _web2.default(
  new _web2.default.providers.HttpProvider(
  'http://' + node + ':' + port));


};

const web3 = exports.web3 = web3Connect(node, port);exports.default =

web3;
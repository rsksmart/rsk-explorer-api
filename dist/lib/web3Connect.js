'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.default =

web3Connect;var _web = require('web3');var _web2 = _interopRequireDefault(_web);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function web3Connect(node, port) {
  return new _web2.default(
  new _web2.default.providers.HttpProvider(
  'http://' + node + ':' + port));


}
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.web3 = exports.web3Connect = void 0;var _web = _interopRequireDefault(require("web3"));
var _config = _interopRequireDefault(require("./config"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const url = _config.default.source.url;

const web3Connect = url => {
  return new _web.default(
  new _web.default.providers.HttpProvider(url));

};exports.web3Connect = web3Connect;

const web3 = web3Connect(url);exports.web3 = web3;var _default =

web3;exports.default = _default;
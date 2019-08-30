"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.nod3 = exports.nod3Connect = void 0;var _nod = _interopRequireDefault(require("nod3"));
var _config = _interopRequireDefault(require("./config"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const url = _config.default.source.url;

const nod3Connect = url => {
  return new _nod.default(
  new _nod.default.providers.HttpProvider(url));

};exports.nod3Connect = nod3Connect;

const nod3 = nod3Connect(url);exports.nod3 = nod3;var _default =

nod3;exports.default = _default;
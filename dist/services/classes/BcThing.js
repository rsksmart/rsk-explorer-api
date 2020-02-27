"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports._methodNotImplemented = exports.BcThing = void 0;var _utils = require("../../lib/utils");
var _NativeContracts = _interopRequireDefault(require("../../lib/NativeContracts"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class BcThing {
  constructor({ nod3, initConfig, collections } = {}) {
    if (!initConfig) throw new Error('missing init config');
    this.initConfig = initConfig;
    this.nod3 = nod3;
    this.collections = collections;
    this.nativeContracts = (0, _NativeContracts.default)(initConfig);
    this.data = {};
  }
  getData(serialize = false) {
    return serialize ? this.serialize(this.data) : this.data;
  }
  serialize(obj) {
    return (0, _utils.serialize)(obj);
  }
  isAddress(address) {
    return (0, _utils.isAddress)(address);
  }
  fetch() {
    return _methodNotImplemented('fetch');
  }
  save() {
    return _methodNotImplemented('save');
  }
  isBlockHash(hashOrNumber) {
    return (0, _utils.isBlockHash)(hashOrNumber);
  }}exports.BcThing = BcThing;


const _methodNotImplemented = method => {
  throw new Error(`Method ${method} is not implemented`);
};exports._methodNotImplemented = _methodNotImplemented;var _default =

BcThing;exports.default = _default;
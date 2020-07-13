"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports._methodNotImplemented = exports.BcThing = void 0;var _utils = require("../../lib/utils");
var _NativeContracts = _interopRequireDefault(require("../../lib/NativeContracts"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class BcThing {
  constructor({ nod3, initConfig, collections, log } = {}) {
    if (!initConfig) throw new Error('missing init config');
    this.initConfig = initConfig;
    this.collections = collections;
    this.nod3 = nod3;
    this.nativeContracts = (0, _NativeContracts.default)(initConfig);
    this.data = {};
    this.log = log || console;
  }

  setData(data) {
    if (!data) return;
    if (typeof data !== 'object') throw new Error('Data must be an object');
    for (let p in data) {
      this.data[p] = data[p];
    }
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
  isTxOrBlockHash(str) {
    return (0, _utils.isTxOrBlockHash)(str);
  }
  isBlockHash(hashOrNumber) {
    return (0, _utils.isBlockHash)(hashOrNumber);
  }}exports.BcThing = BcThing;


const _methodNotImplemented = method => {
  throw new Error(`Method ${method} is not implemented`);
};exports._methodNotImplemented = _methodNotImplemented;var _default =

BcThing;exports.default = _default;
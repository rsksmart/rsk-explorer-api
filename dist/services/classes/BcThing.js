"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports._methodNotImplemented = exports.BcThing = void 0;var _utils = require("../../lib/utils");

class BcThing {
  constructor({ nod3, nativeContracts, collections } = {}) {
    this.nod3 = nod3;
    this.collections = collections;
    this.nativeContracts = nativeContracts;
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
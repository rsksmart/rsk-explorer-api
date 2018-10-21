'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports._methodNotImplemented = exports.BcThing = undefined;var _utils = require('../../lib/utils');

class BcThing {
  constructor(nod3, collections) {
    this.nod3 = nod3;
    this.collections = collections;
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


const _methodNotImplemented = exports._methodNotImplemented = method => {
  throw new Error(`Method ${method} is not implemented`);
};exports.default =

BcThing;
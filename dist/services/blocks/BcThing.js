'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.BcThing = undefined;var _utils = require('../../lib/utils');

class BcThing {
  constructor(web3) {
    this.web3 = web3;
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
    console.error('Method fetch is not imlpemented');
    return null;
  }}exports.BcThing = BcThing;exports.default =


BcThing;
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.Addresses = void 0;var _Address = _interopRequireDefault(require("./Address"));
var _utils = require("../../lib/utils");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class Addresses {
  constructor({ nod3, initConfig, collections }) {
    this.collections = collections;
    this.nod3 = nod3;
    this.initConfig = initConfig;
    this.addresses = {};
  }
  add(address, options = {}) {
    if (!(0, _utils.isAddress)(address)) throw new Error(`Invalid address ${address}`);
    if (!this.addresses[address]) {
      options = options || {};
      let { nod3, initConfig, collections } = this;
      options = Object.assign(options, { nod3, initConfig, collections });
      this.addresses[address] = new _Address.default(address, options);
    }
    return this.addresses[address];
  }

  list() {
    return Object.values(this.addresses);
  }

  async fetch(forceFetch) {
    try {
      let addresses = this.list();
      for (let address of addresses) {
        await address.fetch(forceFetch);
      }
      return addresses.map(a => a.getData());
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async save() {
    try {
      await this.fetch();
      let addresses = this.list();
      let result = await Promise.all([...addresses.map(a => a.save())]);
      return result;
    } catch (err) {
      return Promise.reject(err);
    }
  }}exports.Addresses = Addresses;var _default =


Addresses;exports.default = _default;
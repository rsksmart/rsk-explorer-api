"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.TokenAddress = void 0;var _BcThing = require("./BcThing");
var _Contract = _interopRequireDefault(require("./Contract"));
var _utils = require("../../lib/utils");
var _rskUtils = require("rsk-utils");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class TokenAddress extends _BcThing.BcThing {
  constructor(address, contract) {
    if (!(contract instanceof _Contract.default)) {
      throw new Error('contract is not instance of Contract');
    }
    if (!(0, _utils.isAddress)(address)) throw new Error(`Invalid address ${address}`);
    let { block } = contract;
    if (!(0, _utils.isBlockObject)(block)) {
      throw new Error(`Block must be a block object`);
    }
    const { initConfig } = contract;
    super({ initConfig });
    if (!this.isAddress(address)) {
      throw new Error(`TokenAddress: invalid address: ${address}`);
    }
    this.isZeroAddress = (0, _rskUtils.isZeroAddress)(address);
    this.Contract = contract;
    this.address = address;
    let { number, hash } = block;
    this.data = {
      address,
      contract: this.Contract.address,
      balance: null,
      block: { number, hash } };

  }
  async fetch() {
    try {
      let balance = await this.getBalance();
      this.data.balance = balance;
      return this.getData(true);
    } catch (err) {
      return Promise.reject(err);
    }
  }
  getBalance() {
    if (this.isZeroAddress) return null;
    return this.Contract.call('balanceOf', [this.address]);
  }}exports.TokenAddress = TokenAddress;var _default =


TokenAddress;exports.default = _default;
'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _BcThing = require('./BcThing');
var _ContractParser = require('../../lib/ContractParser/ContractParser');var _ContractParser2 = _interopRequireDefault(_ContractParser);
var _types = require('../../lib/types');
var _TokenAddress = require('./TokenAddress');var _TokenAddress2 = _interopRequireDefault(_TokenAddress);
var _utils = require('../../lib/utils');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class Contract extends _BcThing.BcThing {
  constructor(address, creationData, nod3, parser) {
    super(nod3);
    if (!this.isAddress(address)) throw new Error(`Contract: invalid address ${address}`);
    parser = parser || new _ContractParser2.default();
    this.parser = parser;
    this.address = address;
    this.creationData = creationData;
    const createdByTx = creationData && creationData.tx ? creationData.tx : null;
    this.data = {
      address,
      createdByTx,
      addresses: [] };

    this.contract = this.makeContract();
    this.addresses = {};
  }

  async fetch() {
    try {
      // new contracts
      if (this.creationData) {
        let txInputData = this.creationData.tx.input;
        let info = await this.parser.getContractInfo(txInputData, this.contract);
        let { interfaces, methods } = info;
        if (interfaces.length) this.data.contractInterfaces = interfaces;
        if (methods) this.data.contractMethods = methods;
        if (this.isToken(interfaces)) {
          let tokenData = await this.getTokenData();
          if (tokenData) this.data = Object.assign(this.data, tokenData);
        }
      }

      this.data.addresses = await this.fetchAddresses();
      let data = this.getData();
      return data;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  makeContract() {
    return this.parser.makeContract(this.address);
  }

  getTokenData() {
    return this.parser.getTokenData(this.contract);
  }

  addAddress(address) {
    if (!this.isAddress(address)) return;
    if (!this.addresses[address]) {
      let Address = this.newAddress(address);
      this.addresses[address] = Address;
      return Address;
    }
  }

  newAddress(address) {
    return new _TokenAddress2.default(address, this);
  }

  call(method, params = []) {
    const contract = this.contract;
    return this.parser.call(method, contract, params);
  }

  isToken(interfaces) {
    return (0, _utils.hasValue)(interfaces, _types.tokensInterfaces);
  }
  async fetchAddresses() {
    let data = [];
    for (let a in this.addresses) {
      let Address = this.addresses[a];
      let addressData = await Address.fetch();
      if (addressData) data.push(addressData);
    }
    return data;
  }}exports.default =

Contract;
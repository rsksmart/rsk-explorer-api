'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _BcThing = require('./BcThing');
var _ContractParser = require('../../lib/ContractParser');var _ContractParser2 = _interopRequireDefault(_ContractParser);
var _types = require('../../lib/types');
var _TokenAddress = require('./TokenAddress');var _TokenAddress2 = _interopRequireDefault(_TokenAddress);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class Contract extends _BcThing.BcThing {
  constructor(address, creationData, web3, parser) {
    super(web3);
    if (!this.isAddress(address)) throw new Error(`Contract: invalid address ${address}`);
    parser = parser || new _ContractParser2.default(web3);
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
    // new contracts
    if (this.creationData) {
      let tokenData = await this.getTokenData();
      if (tokenData) this.data = Object.assign(this.data, tokenData);
      let isErc20 = this.isErc20();
      if (isErc20) this.data.contractType = _types.contractsTypes.ERC20;
    } else {
      // saved contracts
      let totalSupply = await this.call('totalSupply');
      if (totalSupply) this.data = Object.assign(this.data, { totalSupply });
    }
    this.data.addresses = await this.fetchAddresses();
    return this.getData();
  }

  makeContract() {
    return this.parser.makeContract(this.address);
  }

  getTokenData() {
    return this.parser.getTokenData(this.contract);
  }

  isErc20() {
    if (this.creationData) {
      return this.parser.hasErc20methods(this.creationData.tx.input);
    }
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

  call(method, params) {
    const contract = this.contract;
    return this.parser.call(method, contract, params);
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
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _BcThing = require("./BcThing");
var _rskContractParser = _interopRequireDefault(require("rsk-contract-parser"));
var _types = require("../../lib/types");
var _TokenAddress = _interopRequireDefault(require("./TokenAddress"));
var _utils = require("../../lib/utils");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class Contract extends _BcThing.BcThing {
  constructor(address, deployedCode, { dbData, abi, nod3, initConfig, collections, block }) {
    super({ nod3, initConfig, collections });
    if (!this.isAddress(address)) throw new Error(`Contract: invalid address ${address}`);
    this.address = address;
    this.deployedCode = deployedCode;
    this.data = {
      address };

    this.addresses = {};
    this.fetched = false;
    this.contract = undefined;
    this.abi = abi;
    this.parser = undefined;
    this.isToken = false;
    this.block = block;
    if (dbData) this.setData(dbData);
  }

  async fetch() {
    try {
      let { deployedCode, fetched } = this;

      if (fetched) return this.getData();
      let contract = await this.getContract();
      // new contracts
      if (!this.data.contractInterfaces) {
        if (!deployedCode) throw new Error(`Missing deployed code for contract: ${this.address}`);
        let info = await this.parser.getContractInfo(deployedCode, contract);
        let { interfaces, methods } = info;
        if (interfaces.length) this.setData({ contractInterfaces: interfaces });
        if (methods) this.setData({ contractMethods: methods });
      }
      let { contractInterfaces, tokenData } = this.data;
      this.isToken = (0, _utils.hasValue)(contractInterfaces || [], _types.tokensInterfaces);
      if (this.isToken && !tokenData) {
        let tokenData = await this.getToken();
        if (tokenData) this.setData(tokenData);
      }
      let data = this.getData();
      this.fetched = true;
      return data;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getParser() {
    try {
      let { parser, nod3, initConfig, log } = this;
      if (parser) return parser;
      let abi = await this.getAbi();
      this.parser = new _rskContractParser.default({ abi, nod3, initConfig, log });
      return this.parser;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getContract() {
    try {
      let { address, contract } = this;
      if (contract) return contract;
      // get abi
      let abi = await this.getAbi();
      let parser = await this.getParser();
      this.contract = parser.makeContract(address, abi);
      return this.contract;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getAbi() {
    try {
      let { address, collections, abi } = this;
      if (abi) return abi;
      let data = {};
      if (collections) {
        data = await collections.VerificationsResults.findOne({ address });
        if (data && data.abi) this.abi = data.abi;
      }
      return this.abi;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  getToken() {
    let { contractMethods } = this.data;
    let { parser, contract } = this;
    let methods = ['name', 'symbol', 'decimals', 'totalSupply'];
    methods = methods.filter(m => contractMethods.includes(`${m}()`));
    return parser.getTokenData(contract, { methods });
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
    return new _TokenAddress.default(address, this);
  }

  call(method, params = []) {
    let { contract, parser } = this;
    if (!contract) throw new Error('Fetch first');
    return parser.call(method, contract, params);
  }

  async fetchAddresses() {
    if (!this.fetched) await this.fetch();
    let data = [];
    let { addresses } = this;
    if (!this.isToken) return data;
    for (let a in addresses) {
      let Address = addresses[a];
      await Address.fetch();
      let addressData = Address.getData(true);
      if (addressData) data.push(addressData);
    }
    return data;
  }}var _default =

Contract;exports.default = _default;
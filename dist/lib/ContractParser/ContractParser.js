"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.ContractParser = void 0;var _event = _interopRequireDefault(require("web3/lib/web3/event.js"));
var _Abi = _interopRequireDefault(require("./Abi"));
var _web3Connect = require("../web3Connect");
var _types = require("../types");
var _interfacesIds = _interopRequireDefault(require("./interfacesIds"));
var _utils = require("../../lib/utils");
var _RemascEvents = _interopRequireDefault(require("./RemascEvents"));
var _lib = require("./lib");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}









class ContractParser {
  constructor({ abi, log, nativeContracts } = {}) {
    if (!nativeContracts) throw new Error('Missing native contracts');
    this.abi = null;
    this.abi = (0, _lib.setAbi)(abi || _Abi.default);
    this.eventsAbi = (0, _lib.abiEvents)(this.abi);
    this.web3 = _web3Connect.web3;
    this.log = log || console;
    this.nativeContracts = nativeContracts;
  }

  getRemascAddress() {
    const { nativeContracts } = this;
    if (nativeContracts) {
      return nativeContracts.getNativeContractAddress('remasc');
    }
  }

  setAbi(abi) {
    this.abi = (0, _lib.setAbi)(abi);
    this.eventsAbi = (0, _lib.abiEvents)(this.abi);
  }

  setWeb3(web3) {
    if (web3) this.web3 = web3;
  }
  getMethodsSelectors() {
    let selectors = {};
    let methods = this.getAbiMethods();
    for (let m in methods) {
      let method = methods[m];
      let signature = method.signature || (0, _lib.soliditySignature)(m);
      selectors[m] = (0, _lib.soliditySelector)(signature);
    }
    return selectors;
  }

  getAbiMethods() {
    let methods = {};
    this.abi.filter(def => def.type === 'function').
    map(m => {
      let sig = m[_lib.ABI_SIGNATURE] || (0, _lib.abiSignatureData)(m);
      sig.name = m.name;
      methods[sig.method] = sig;
    });
    return methods;
  }

  parseTxLogs(logs) {
    return logs.map(log => {
      // non-standard remasc events
      const remascAddress = this.getRemascAddress();
      if (log.address === remascAddress) return _RemascEvents.default.decode(log);

      let back = Object.assign({}, log);
      let decoder = this.getLogDecoder(log.topics || []);
      let decoded = decoder ? decoder.event.decode(log) : log;
      decoded.topics = back.topics;
      decoded.data = back.data;
      if (decoder) {
        let signature = Object.assign({}, decoder.abi[_lib.ABI_SIGNATURE]);
        decoded.signature = signature.signature;
        decoded.abi = (0, _lib.removeAbiSignaureData)(decoder.abi);
        // convert args object to array to remove properties names
        if (decoded.args) {
          let inputs = decoded.abi.inputs || [];
          let args = inputs.map(i => i.name).map(i => decoded.args[i]);
          decoded.args = args;
        }
      }
      return decoded;
    }).map(log => {
      let abi = log.abi;
      if (abi && abi.inputs) {
        abi.inputs.forEach(param => {
          if (param.type === 'bytes32') {
            log.args[param.name] = this.web3.toAscii(log.args[param.name]);
          }
        });
      }
      return log;
    });
  }

  getLogDecoder(topics) {
    if (!topics.length) return null;
    let events = this.eventsAbi;
    let signature = topics[0].slice(2);
    let indexed = topics.length - 1;
    let decoders = events.
    filter(e => {
      let s = e[_lib.ABI_SIGNATURE];
      return s.signature === signature && s.indexed === indexed;
    });
    if (decoders.length) {
      if (decoders[1]) this.log.error(`ERROR, dupplicated event: ${decoders[0].name}`);
      return this.createLogDecoder(decoders[0]);
    }
  }

  createLogDecoder(abi) {
    abi = Object.assign({}, abi);
    const event = new _event.default(null, abi, null);
    return { abi, event };
  }

  makeContract(address, abi) {
    abi = abi || this.abi;
    return this.web3.eth.contract(abi).at(address);
  }

  call(method, contract, params = []) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(params)) reject(new Error(`Params must be an array`));
      contract[method].call(...params, (err, res) => {
        if (err !== null) {
          this.log.warn(`Method ${method} call ${err}`);
          resolve(null);
          // return reject(err)
        } else {
          resolve(res);
        }
      });
    });
  }

  async getTokenData(contract) {
    const methods = ['name', 'symbol', 'decimals', 'totalSupply'];
    let [name, symbol, decimals, totalSupply] = await Promise.all(
    methods.map((m) =>
    this.call(m, contract).
    then(res => res).
    catch(err => this.log.debug(`[${contract.address}] Error executing ${m}  Error: ${err}`))));

    return { name, symbol, decimals, totalSupply };
  }

  hasMethodSelector(txInputData, selector) {
    return selector && txInputData ? txInputData.includes(selector) : null;
  }

  getMethodsBySelectors(txInputData) {
    let methods = this.getMethodsSelectors();
    return Object.keys(methods).
    filter(method => this.hasMethodSelector(txInputData, methods[method]) === true);
  }

  async getContractInfo(txInputData, contract) {
    let methods = this.getMethodsBySelectors(txInputData);
    let isErc165 = false;
    //  skip non-erc165 conrtacts
    if ((0, _utils.includesAll)(methods, ['supportsInterface(bytes4)'])) {
      isErc165 = await this.implementsErc165(contract);
    }
    let interfaces;
    if (isErc165) interfaces = await this.getInterfacesERC165(contract);else
    interfaces = this.getInterfacesByMethods(methods);
    interfaces = Object.keys(interfaces).
    filter(k => interfaces[k] === true).
    map(t => _types.contractsInterfaces[t] || t);
    return { methods, interfaces };
  }

  async getInterfacesERC165(contract) {
    let ifaces = {};
    let keys = Object.keys(_interfacesIds.default);
    for (let i of keys) {
      ifaces[i] = await this.supportsInterface(contract, _interfacesIds.default[i].id);
    }
    return ifaces;
  }

  getInterfacesByMethods(methods, isErc165) {
    return Object.keys(_interfacesIds.default).
    map(i => {
      return [i, (0, _utils.includesAll)(methods, _interfacesIds.default[i].methods)];
    }).
    reduce((obj, value) => {
      obj[value[0]] = value[1];
      return obj;
    }, {});
  }

  async supportsInterface(contract, interfaceId) {
    // fixed gas to prevent infinite loops
    let options = { gas: 30000 };
    let res = await this.call('supportsInterface', contract, [interfaceId, options]);
    return res;
  }

  async implementsErc165(contract) {
    try {
      let first = await this.supportsInterface(contract, _interfacesIds.default.ERC165.id);
      if (first === true) {
        let second = await this.supportsInterface(contract, '0xffffffff');
        return !(second === true || second === null);
      }
      return false;
    } catch (err) {
      return Promise.reject(err);
    }
  }}exports.ContractParser = ContractParser;var _default =


ContractParser;exports.default = _default;
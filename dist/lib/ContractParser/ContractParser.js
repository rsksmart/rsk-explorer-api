'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.addSignatureDataToAbi = exports.abiSignatureData = exports.removeAbiSignaureData = exports.ABI_SIGNATURE = exports.solidityName = exports.soliditySignature = exports.abiMethods = exports.abiEvents = undefined;var _event = require('web3/lib/web3/event.js');var _event2 = _interopRequireDefault(_event);
var _Abi = require('./Abi');var _Abi2 = _interopRequireDefault(_Abi);
var _web3Connect = require('../web3Connect');
var _utils = require('../utils');
var _types = require('../types');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
class ContractParser {
  constructor(abi, options = {}) {
    this.abi = null;
    this.abi = setAbi(abi || _Abi2.default);
    this.web3 = _web3Connect.web3;
    this.log = options.logger || console;
  }

  setAbi(abi) {
    this.abi = setAbi(abi);
  }

  setWeb3(web3) {
    if (web3) this.web3 = web3;
  }
  getMethodsKeys() {
    let keys = {};
    let methods = this.getAbiMethods();
    for (let m in methods) {
      let method = methods[m];
      let signature = method.signature || soliditySignature(m);
      keys[m] = signature.slice(0, 8);
    }
    return keys;
  }
  getAbiMethods() {
    let methods = {};
    this.abi.filter(def => def.type === 'function').
    map(m => {
      let sig = m[ABI_SIGNATURE] || abiSignatureData(m);
      sig.name = m.name;
      methods[sig.method] = sig;
    });
    return methods;
  }

  parseTxLogs(logs) {
    const abi = this.abi;
    let decoders = abi.filter(def => def.type === 'event').
    map(def => {
      return { abi: def, event: new _event2.default(null, def, null) };
    });

    return logs.map(log => {
      let back = Object.assign({}, log);
      let decoder = decoders.find(decoder => {
        if (!log.topics.length) return false;
        return decoder.event.signature() === log.topics[0].slice(2);
      });
      let decoded = decoder ? decoder.event.decode(log) : log;

      decoded.topics = back.topics;
      decoded.data = back.data;
      if (decoder) decoded.abi = removeAbiSignaureData(decoder.abi);
      return decoded;
    }).map(log => {
      // Hmm review
      let abis = abi.find(def => {
        return def.type === 'event' && log.event === def.name;
      });
      if (abis && abis.inputs) {
        abis.inputs.forEach(param => {
          if (param.type === 'bytes32') {
            log.args[param.name] = this.web3.toAscii(log.args[param.name]);
          }
        });
      }
      return log;
    });
  }

  makeContract(address, abi) {
    abi = abi || this.abi;
    return this.web3.eth.contract(abi).at(address);
  }
  call(method, contract, params) {
    return new Promise((resolve, reject) => {
      contract[method].call(params, (err, res) => {
        if (err !== null) {
          resolve(null);
          return reject(err);
        } else {
          resolve(res);
        }
      });
    });
  }

  async getTokenData(contract) {
    const methods = ['name', 'symbol', 'decimals', 'totalSupply'];
    let [name, symbol, decimals, totalSupply] = await Promise.all(
    methods.map(m =>
    this.call(m, contract).
    then(res => res).
    catch(err => this.log.debug(`[${contract.address}] Error executing ${m}  Error: ${err}`))));

    return { name, symbol, decimals, totalSupply };
  }

  hasMethodSignature(txInputData, signature) {
    return signature ? txInputData.includes(signature) : null;
  }

  getMethods(txInputData) {
    let methods = this.getMethodsKeys();
    return Object.keys(methods).
    filter(method => this.hasMethodSignature(txInputData, methods[method]) === true);
  }

  getContractInfo(txInputData) {
    let methods = this.getMethods(txInputData);
    let interfaces = this.getContractInterfaces(methods);
    return { methods, interfaces };
  }

  getContractInterfaces(methods) {
    let types = this.testContractTypes(methods);
    return Object.keys(types).
    filter(k => types[k] === true).
    map(t => _types.contractsTypes[t]);
  }

  testContractTypes(methods) {
    return {
      ERC20: this.hasErc20methods(methods),
      ERC667: this.hasErc667methods(methods) };

  }

  hasErc20methods(methods) {
    return (0, _utils.hasValues)(methods, [
    'totalSupply()',
    'balanceOf(address)',
    'allowance(address,address)',
    'transfer(address,uint256)',
    'approve(address,uint256)',
    'transferFrom(address,address,uint256)']);

  }

  hasErc667methods(methods) {
    return this.hasErc20methods(methods) &&
    (0, _utils.hasValues)(methods, [
    'transferAndCall(address,uint256,bytes)']);

  }}


const setAbi = abi => addSignatureDataToAbi(abi, true);

const abiEvents = exports.abiEvents = abi => abi.filter(v => v.type === 'event');

const abiMethods = exports.abiMethods = abi => abi.filter(v => v.type === 'function');

const soliditySignature = exports.soliditySignature = name => (0, _utils.keccak256)(name);

const solidityName = exports.solidityName = abi => {
  let { name, inputs } = abi;
  inputs = inputs ? inputs.map(i => i.type) : [];
  return name ? `${name}(${inputs.join(',')})` : null;
};

const ABI_SIGNATURE = exports.ABI_SIGNATURE = '__signatureData';

const removeAbiSignaureData = exports.removeAbiSignaureData = abi => {
  if (undefined !== abi[ABI_SIGNATURE]) delete abi[ABI_SIGNATURE];
  return abi;
};

const abiSignatureData = exports.abiSignatureData = value => {
  let method = solidityName(value);
  let signature = method ? soliditySignature(method) : null;
  return { method, signature };
};

const addSignatureDataToAbi = exports.addSignatureDataToAbi = (abi, skip) => {
  abi.map((value, i) => {
    if (!value[ABI_SIGNATURE] || !skip) {
      value[ABI_SIGNATURE] = abiSignatureData(value);
    }
  });
  return abi;
};exports.default =

ContractParser;
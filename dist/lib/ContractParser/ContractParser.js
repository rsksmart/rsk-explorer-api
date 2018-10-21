'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _event = require('web3/lib/web3/event.js');var _event2 = _interopRequireDefault(_event);
var _Abi = require('./Abi');var _Abi2 = _interopRequireDefault(_Abi);
var _web3Connect = require('../web3Connect');
var _utils = require('../utils');
var _types = require('../types');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
class ContractParser {
  constructor(abi) {
    this.abi = abi || _Abi2.default;
    this.web3 = _web3Connect.web3;
    this.methods = this.getAbiMethods();
    this.methodsKeys = this.getMethodsKeys();
  }

  setWeb3(web3) {
    if (web3) this.web3 = web3;
  }
  getMethodsKeys() {
    let keys = {};
    let methods = this.methods;
    for (let method in methods) {
      keys[method] = this.web3.sha3(`${method}(${methods[method]})`).slice(2, 10);
    }
    return keys;
  }
  getAbiMethods() {
    let methods = {};
    this.abi.filter(def => def.type === 'function').
    map(m => {methods[m.name] = m.inputs.map(i => i.type);});
    return methods;
  }

  parseTxLogs(logs) {
    const abi = this.abi;
    let decoders = abi.filter(def => def.type === 'event').
    map(def => new _event2.default(null, def, null));

    return logs.map(log => {
      let decoder = decoders.find(decoder => {
        if (!log.topics.length) return false;
        return decoder.signature() === log.topics[0].slice(2);
      });
      return decoder ? decoder.decode(log) : log;
    }).map(log => {
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
      contract[method](params, (err, res) => {
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
    catch(err => console.log(`[${contract.address}] Error executing ${m}  Error: ${err}`))));

    return { name, symbol, decimals, totalSupply };
  }

  hasMethod(txInputData, method) {
    let key = this.methodsKeys[method];
    if (!key) console.log(`Unknown method: ${method}`);
    return key ? txInputData.includes(key) : null;
  }

  getMethods(txInputData) {
    return Object.keys(this.methods).
    filter(method => this.hasMethod(txInputData, method) === true);
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
    'totalSupply',
    'balanceOf',
    'allowance',
    'transfer',
    'approve',
    'transferFrom']);
  }

  hasErc667methods(methods) {
    return this.hasErc20methods(methods) &&
    (0, _utils.hasValues)(methods, ['transferAndCall']);
  }}exports.default =


ContractParser;
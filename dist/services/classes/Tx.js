"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.Tx = void 0;var _BcThing = require("./BcThing");
var _Event = require("./Event");
var _ContractParser = _interopRequireDefault(require("../../lib/ContractParser/ContractParser"));
var _types = require("../../lib/types");
var _ids = require("../../lib/ids");
var _utils = require("../../lib/utils");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
class Tx extends _BcThing.BcThing {
  constructor(hash, timestamp, { nod3, nativeContracts } = {}) {
    if (!hash || !timestamp) throw new Error(`Tx, missing arguments`);
    super({ nod3, nativeContracts });
    this.hash = hash;
    this.timestamp = timestamp;
    this.contractParser = new _ContractParser.default({ nativeContracts });
  }
  async fetch() {
    try {
      let tx = await this.getTx();
      let events = await this.parseEvents(tx);
      this.data = { tx, events };
      return this.getData();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getTx() {
    try {
      let txHash = this.hash;
      let tx = await this.getTransactionByHash(txHash);
      if (tx.hash !== txHash) throw new Error(`Error getting tx: ${txHash}, hash received:${tx.hash}`);
      let receipt = await this.getTxReceipt(txHash);
      if (!receipt) throw new Error(`The Tx ${txHash} .receipt is: ${receipt} `);
      tx.timestamp = this.timestamp;
      tx.receipt = receipt;
      if (!tx.transactionIndex) tx.transactionIndex = receipt.transactionIndex;
      tx = this.txFormat(tx);
      return tx;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  getTransactionByHash(txHash) {
    return this.nod3.eth.getTransactionByHash(txHash);
  }

  getTxReceipt(txHash) {
    return this.nod3.eth.getTransactionReceipt(txHash);
  }
  async parseEvents(tx) {
    try {
      let topics = await this.parseLogs(tx.receipt.logs);
      return topics.map(topic => {
        topic = (0, _Event.formatEvent)(topic, tx);
        let event = Object.assign({}, topic);
        delete event.eventId;
        delete topic._id;
        return event;
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }
  txFormat(tx) {
    tx.txType = _types.txTypes.default;
    const receipt = tx.receipt || {};
    const toIsNative = this.nativeContracts.isNativeContract(tx.to);
    let nativeType = _types.txTypes[toIsNative];
    if (nativeType) tx.txType = nativeType;
    if ((0, _utils.isAddress)(receipt.contractAddress)) tx.txType = _types.txTypes.contract;
    tx._id = (0, _ids.getTxOrEventId)(tx);
    return tx;
  }

  parseLogs(logs) {
    let parser = this.contractParser;
    return new Promise((resolve, reject) => {
      process.nextTick(() => resolve(parser.parseTxLogs(logs)));
    });
  }}exports.Tx = Tx;var _default =


Tx;exports.default = _default;
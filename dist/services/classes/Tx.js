"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.Tx = void 0;var _BcThing = require("./BcThing");
var _Event = require("./Event");
var _rskContractParser = _interopRequireDefault(require("rsk-contract-parser"));
var _types = require("../../lib/types");
var _ids = require("../../lib/ids");
var _utils = require("../../lib/utils");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
class Tx extends _BcThing.BcThing {
  constructor(hash, timestamp, { txData, nod3, initConfig } = {}) {
    if (!hash || !timestamp) throw new Error(`Tx, missing arguments`);
    super({ nod3, initConfig });
    this.hash = hash;
    this.timestamp = timestamp;
    this.contractParser = new _rskContractParser.default({ initConfig, nod3 });
    this.txData = txData;
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
      let tx = this.txData;
      if (!this.isTxData(tx)) tx = await this.getTransactionByHash(txHash);
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
      let logs = await this.parseLogs(tx.receipt.logs);
      return logs.map(l => {
        l = (0, _Event.formatEvent)(l, tx);
        let event = Object.assign({}, l);
        delete l._id;
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
    tx.txId = (0, _ids.getTxOrEventId)(tx);
    return tx;
  }

  parseLogs(logs) {
    let parser = this.contractParser;
    return new Promise((resolve, reject) => {
      process.nextTick(() => resolve(parser.parseTxLogs(logs)));
    });
  }
  isTxData(data) {
    if (!data || typeof data !== 'object') return;
    return data.hash && data.blockHash && data.input;
  }}exports.Tx = Tx;var _default =


Tx;exports.default = _default;
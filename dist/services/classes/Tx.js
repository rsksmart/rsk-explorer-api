'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Tx = undefined;var _BcThing = require('./BcThing');
var _txFormat = require('../../lib/txFormat');var _txFormat2 = _interopRequireDefault(_txFormat);
var _Event = require('./Event');
var _ContractParser = require('../../lib/ContractParser/ContractParser');var _ContractParser2 = _interopRequireDefault(_ContractParser);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class Tx extends _BcThing.BcThing {
  constructor(hash, timestamp, { nod3 }) {
    if (!hash || !timestamp) throw new Error(`Tx, missing arguments`);
    super(nod3);
    this.hash = hash;
    this.timestamp = timestamp;
    this.contractParser = new _ContractParser2.default();
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
      tx = (0, _txFormat2.default)(tx);
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

  parseLogs(logs) {
    let parser = this.contractParser;
    return new Promise((resolve, reject) => {
      process.nextTick(() => resolve(parser.parseTxLogs(logs)));
    });
  }}exports.Tx = Tx;exports.default =


Tx;
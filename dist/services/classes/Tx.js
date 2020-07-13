"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createTxObject = createTxObject;exports.getTraceDataFromBlock = getTraceDataFromBlock;exports.getTimestampFromBlock = getTimestampFromBlock;exports.parseLogs = parseLogs;exports.formatEvents = formatEvents;Object.defineProperty(exports, "txTypes", { enumerable: true, get: function () {return _types.txTypes;} });exports.default = exports.Tx = void 0;var _BcThing = require("./BcThing");
var _Event = require("./Event");
var _types = require("../../lib/types");
var _ids = require("../../lib/ids");
var _rskContractParser = _interopRequireDefault(require("rsk-contract-parser"));
var _TxTrace = _interopRequireDefault(require("./TxTrace"));
var _Addresses = require("./Addresses");
var _utils = require("../../lib/utils");
var _BlockSummary = require("./BlockSummary");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class Tx extends _BcThing.BcThing {
  constructor(hash, timestamp, { addresses, txData, blockTrace, blockData, traceData, nod3, initConfig, collections, notTrace, receipt, log } = {}) {
    if (!hash || !timestamp) throw new Error(`Tx, missing arguments`);
    super({ nod3, initConfig, collections, log });
    if (!this.isTxOrBlockHash(hash)) throw new Error(`Tx, ${hash} is not a tx hash`);
    this.hash = hash;
    this.timestamp = timestamp;
    this.txData = txData;
    this.receipt = receipt;
    this.toAddress = undefined;
    this.blockData = blockData;
    if (blockTrace) traceData = getTraceDataFromBlock(hash, blockTrace);
    addresses = addresses || new _Addresses.Addresses({ nod3, initConfig, collections });
    this.addresses = addresses;
    this.trace = !notTrace ? new _TxTrace.default(hash, { traceData, timestamp, nod3, initConfig, log }) : undefined;
    this.data = {
      tx: {},
      events: [],
      tokenAddresses: [] };

  }
  async fetch(force) {
    try {
      let { fetched } = this;
      if (fetched && !force) return this.getData();
      let tx = await this.getTx();
      if (!tx) throw new Error('Error getting tx');
      await this.setBlockData(tx);
      let addressOptions = this.addressOptions();
      await this.setToAddress(tx);
      this.addresses.add(tx.from, addressOptions);
      let { contractAddress } = tx.receipt;
      if (contractAddress) this.addresses.add(contractAddress, addressOptions);
      tx = this.txFormat(tx);
      let { nod3, initConfig } = this;
      let { contract } = this.toAddress || {};
      const parser = contract ? await contract.getParser() : new _rskContractParser.default({ nod3, initConfig });
      if (parser) {
        tx.receipt.logs = parseLogs(tx, parser);
        let events = formatEvents(tx, parser);
        if (tx.receipt.logs.length !== events.length) throw new Error(`logs error ${this.hash}`);
        tx.receipt.logs = events;
        let eventAddresses = [].concat(...events.filter(e => e._addresses).map(({ _addresses }) => _addresses));
        eventAddresses.forEach(address => this.addresses.add(address, addressOptions));
        this.setData({ events });
        if (contract) {
          eventAddresses.forEach(address => contract.addAddress(address));
          let tokenAddresses = await contract.fetchAddresses();
          this.setData({ tokenAddresses });
        }
      }
      if (this.trace) {
        let trace = await this.trace.fetch();
        let { internalTransactions, addresses } = await this.trace.getInternalTransactionsData(trace);
        addresses.forEach(address => this.addresses.add(address, addressOptions));
        this.setData({ trace, internalTransactions });
      }
      this.setData({ tx });
      this.fetched = true;
      return this.getData();
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async setBlockData({ blockHash }) {
    try {
      let { blockData, nod3 } = this;
      if (!(0, _utils.isBlockObject)(blockData) || blockData.hash !== blockHash) {
        blockData = await (0, _BlockSummary.getBlock)(blockHash, false, nod3);
        this.blockData = blockData;
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async setToAddress({ to }) {
    try {
      let { isAddress, toAddress } = this;
      if (toAddress !== undefined) return toAddress;
      if (to !== null) {
        if (!isAddress(to)) throw new Error(`Invalid address ${to}`);
        this.toAddress = this.addresses.add(to, this.addressOptions());
        await this.toAddress.fetch();
      } else {
        this.toAddress = null;
      }
      return this.toAddress;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async getTx() {
    try {
      let txHash = this.hash;
      let { txData } = this;
      if (!this.isTxData(txData)) {
        txData = await this.getTransactionByHash(txHash);
        this.txData = txData;
      }
      if (txData.hash !== txHash) throw new Error(`Error getting tx: ${txHash}, hash received:${txData.hash}`);
      let { receipt } = this;
      if (!receipt) {
        receipt = await this.getTxReceipt(txHash);
        if (!receipt) throw new Error(`The Tx ${txHash} .receipt is: ${receipt} `);
      }
      this.receipt = receipt;
      let { timestamp } = this;
      if (!timestamp) timestamp = await getTimestampFromBlock(txData, this.nod3);
      let tx = createTxObject(txData, { timestamp, receipt });
      if (!tx.transactionIndex) tx.transactionIndex = receipt.transactionIndex;
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
  txFormat(tx) {
    let type = _types.txTypes.default;
    const receipt = tx.receipt || {};
    let { toAddress } = this;
    if (toAddress && toAddress.isContract()) type = _types.txTypes.call;
    const toIsNative = this.nativeContracts.isNativeContract(tx.to);
    let nativeType = _types.txTypes[toIsNative];
    if (nativeType) type = nativeType;
    if (this.isAddress(receipt.contractAddress)) type = _types.txTypes.contract;
    tx.txType = type;
    tx.txId = (0, _ids.getTxOrEventId)(tx);
    return tx;
  }

  isTxData(data) {
    if (!data || typeof data !== 'object') return;
    return data.hash && data.blockHash && data.input;
  }
  addressOptions() {
    let block = this.blockData;
    return { block };
  }}exports.Tx = Tx;


function createTxObject(tx, { timestamp, receipt }) {
  if (!Object.keys(tx).length) throw new Error('invalid tx');
  if (!Object.keys(receipt).length) throw new Error('invalid tx receipt');
  // TODO check timestamp
  tx.timestamp = timestamp;
  tx.receipt = receipt;
  return tx;
}

function getTraceDataFromBlock(hash, blockTrace) {
  if (!Array.isArray(blockTrace)) return;
  return blockTrace.filter(({ transactionHash }) => transactionHash === hash);
}

async function getTimestampFromBlock({ blockHash }, nod3) {
  try {
    let data = await nod3.eth.getBlok(blockHash);
    let { timestamp } = data;
    return timestamp;
  } catch (err) {
    return Promise.reject(err);
  }
}

function parseLogs(tx, parser) {
  return parser.parseTxLogs(tx.receipt.logs);
}
function formatEvents(tx) {
  return tx.receipt.logs.map(l => {
    l = (0, _Event.formatEvent)(l, tx);
    let event = Object.assign({}, l);
    delete l._id;
    return event;
  });
}var _default =


Tx;exports.default = _default;
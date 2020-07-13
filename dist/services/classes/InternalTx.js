"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getInternalTxId = getInternalTxId;exports.filterValueAddresses = filterValueAddresses;exports.default = exports.InternalTx = void 0;var _BcThing = require("./BcThing");
var _ids = require("../../lib/ids");

const REQUIRED_FIELDS = [
'blockHash',
'blockNumber',
'transactionHash',
'transactionPosition',
'type',
'subtraces',
'traceAddress',
'result',
'action',
'timestamp'];


class InternalTx extends _BcThing.BcThing {
  constructor(data, { initConfig }) {
    super({ initConfig });
    this.setData(data);
  }

  checkData(data) {
    if (typeof data !== 'object') throw new Error('Data is not an object');
    for (let field of REQUIRED_FIELDS) {
      if (!data.hasOwnProperty(field)) throw new Error(`Missing field: ${field}`);
    }
    return data;
  }

  setData(data) {
    data = this.checkData(data);
    let id = getInternalTxId(data);
    if (!id) throw new Error(`Invalid internalTxId: ${id}`);
    data.internalTxId = id;
    this.data = data;
  }

  getAddresses() {
    let data = this.getData();
    let { action } = data;
    let { isAddress } = this;
    return Object.entries(action).
    filter(a => {
      let [name, value] = a;
      return name !== 'balance' && isAddress(value);
    }).map(v => v[1]);
  }}exports.InternalTx = InternalTx;


function getInternalTxId({ blockNumber, transactionPosition: transactionIndex, transactionHash: hash, _index: index }) {
  return (0, _ids.generateId)({ blockNumber, transactionIndex, hash, index });
}

function filterValueAddresses(internalTransactions) {
  const addresses = new Set();
  internalTransactions.forEach(({ action, error }) => {
    let { value, from, to } = action;
    if (!error && parseInt(value) > 0) {
      addresses.add(from);
      addresses.add(to);
    }
  });
  return [...addresses];
}var _default =

InternalTx;exports.default = _default;
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.checkInternatTransactionType = checkInternatTransactionType;exports.getInternalTxId = getInternalTxId;exports.filterValueAddresses = filterValueAddresses;exports.checkInternalTransactionData = checkInternalTransactionData;exports.default = exports.InternalTx = void 0;var _BcThing = require("./BcThing");
var _ids = require("../../lib/ids");
var _utils = require("../../lib/utils");

const ITX_FIELDS = {
  blockNumber: null,
  transactionHash: _utils.isBlockHash,
  blockHash: _utils.isBlockHash,
  transactionPosition: null,
  type: checkInternatTransactionType,
  subtraces: null,
  traceAddress: Array.isArray,
  result: null,
  action: null,
  timestamp: null,
  _index: null };


class InternalTx extends _BcThing.BcThing {
  constructor(data, { initConfig }) {
    super({ initConfig });
    this.setData(data);
  }

  checkData(data) {
    return checkInternalTransactionData(data);
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
    let addresses = Object.entries(action).
    filter(([name, value]) => {
      return name !== 'balance' && isAddress(value);
    }).map(v => v[1]);
    return [...new Set(addresses)];
  }

  isSuicide() {
    let { type, action } = this.getData();
    return checkInternatTransactionType(type) === 'suicide' && (0, _utils.isAddress)(action.address);
  }}exports.InternalTx = InternalTx;


function checkInternatTransactionType(type) {
  if (typeof type !== 'string') throw new Error(`Invalid itx type: ${type}`);
  return type;
}

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
      // review suicide and refund address
    }
  });
  return [...addresses];
}

function checkInternalTransactionData(data) {
  if (typeof data !== 'object') throw new Error('Data is not an object');
  for (let field of Object.keys(ITX_FIELDS)) {
    if (!data.hasOwnProperty(field)) throw new Error(`Missing field: ${field}`);
    let value = data[field];
    let check = ITX_FIELDS[field];
    if (typeof check === 'function') {
      if (!check(data[field])) {
        throw new Error(`Invalid value: ${value} for itx field: ${field}`);
      }
    }
  }
  return data;
}var _default =

InternalTx;exports.default = _default;
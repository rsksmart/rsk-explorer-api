'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.hasValues = exports.hasValue = exports.arrayIntersection = exports.getBestBlock = exports.blockQuery = exports.isBlockHash = exports.checkBlockHash = exports.serialize = exports.bigNumberToSring = exports.unSerializeBigNumber = exports.isSerializedBigNumber = exports.serializeBigNumber = exports.isBigNumber = exports.bigNumberDoc = exports.isValidAddress = exports.isAddress = exports.filterSort = exports.filterQuery = exports.filterParams = undefined;var _bignumber = require('bignumber.js');
var _types = require('./types');

const filterParams = exports.filterParams = (params, perPageMax = 50) => {
  params = params || {};
  let perPage = params.perPage || perPageMax;
  perPage = perPage <= perPageMax ? perPage : perPageMax;
  params.page = params.page || 1;
  let limit = params.limit || perPage;
  limit = limit <= perPage ? limit : perPage;
  params.limit = limit;
  params.query = filterQuery(params.query);
  params.sort = filterSort(params.sort);
  return params;
};

const filterQuery = exports.filterQuery = query => {
  if (!query) return;
  if (typeof query === 'object') {
    if (Object.keys(query).length > 0) {
      return sanitizeQuery(query);
    }
  }
};

const filterSort = exports.filterSort = sort => {
  if (!sort) return;
  let filtered = null;
  if (sort && typeof sort === 'object') {
    let keys = Object.keys(sort);
    filtered = {};
    for (let k of keys) {
      let val = sort[k];
      filtered[k] = !val || val === 1 ? 1 : -1;
    }
  }
  return retFiltered(filtered);
};

const sanitizeQuery = query => {
  let filtered = {};
  for (let p in query) {
    let k = p.replace('$', '');
    if (k === p) filtered[k] = query[p];
  }
  return retFiltered(filtered);
};

const retFiltered = filtered => {
  return filtered && Object.keys(filtered).length > 0 ? filtered : null;
};

const isAddress = exports.isAddress = address => {
  return (/^(0x)?[0-9a-f]{40}$/i.test(address));
};

const isValidAddress = exports.isValidAddress = address => {
  throw new Error('Not impemented');
};

const bigNumberDoc = exports.bigNumberDoc = bigNumber => {
  return '0x' + bigNumber.toString(16);
};

const isBigNumber = exports.isBigNumber = value => {
  return isObj(value) && (
  value._isBigNumber === true ||
  value.isBigNumber === true ||
  value instanceof _bignumber.BigNumber ||
  value.lte && value.toNumber);
};

const serializeBigNumber = exports.serializeBigNumber = value => {
  return isBigNumber(value) ? bigNumberDoc(value) : value;
};

const isSerializedBigNumber = exports.isSerializedBigNumber = value => {
  return value.type && value.value && value.type === _types.BIG_NUMBER;
};

const unSerializeBigNumber = exports.unSerializeBigNumber = value => {
  return isSerializedBigNumber(value) ? new _bignumber.BigNumber(value.value) : value;
};

const bigNumberToSring = exports.bigNumberToSring = bn => {
  if (bn.type && bn.type === _types.BIG_NUMBER) return bn.value;
  if (isBigNumber(bn)) return bn.toString();
  return bn;
};

const isObj = value => {
  if (undefined === value || value === null) return false;
  let is = typeof value === 'object';
  is = is ? value instanceof Array === false : is;
  return is;
};

const serialize = exports.serialize = obj => {
  if (typeof obj !== 'object') return obj;
  if (isBigNumber(obj)) return serializeBigNumber(obj);
  let serialized = {};
  for (let p in obj) {
    let value = obj[p];
    if (value !== null && typeof value === 'object') {
      if (value instanceof Array) {
        serialized[p] = value.map(v => serialize(v));
      } else {
        if (!isBigNumber(value)) serialized[p] = serialize(value);else
        serialized[p] = serializeBigNumber(value);
      }
    } else {
      serialized[p] = value;
    }
  }
  return serialized;
};

const checkBlockHash = exports.checkBlockHash = value => {
  value = String(value).toLowerCase();
  if (/^(0x)[0-9a-f]{64}$/.test(value)) return value;
  if (/^[0-9a-f]{64}$/.test(value)) return '0x' + value;
  return null;
};

const isBlockHash = exports.isBlockHash = value => checkBlockHash(value) !== null;

const blockQuery = exports.blockQuery = blockHashOrNumber => {
  const hash = isBlockHash(blockHashOrNumber) ? blockHashOrNumber : null;
  const number = parseInt(blockHashOrNumber);
  if (hash) return { hash };
  if (number || number === 0) return { number };
  return null;
};

const blockTotalDiff = block => bigNumberToSring(block.totalDifficulty);

const getBestBlock = exports.getBestBlock = blocks => {
  blocks.sort((a, b) => {
    let aDiff = blockTotalDiff(a);
    let bDiff = blockTotalDiff(b);
    if (aDiff > bDiff) return -1;
    if (aDiff < bDiff) return 1;
    return 0;
  });
  return blocks[0];
};

const arrayIntersection = exports.arrayIntersection = (a, b) => a.filter(v => b.indexOf(v) !== -1);
const hasValue = exports.hasValue = (arr, search) => arrayIntersection(arr, search).length > 0;
const hasValues = exports.hasValues = (arr, search) => !search.map(t => arr.indexOf(t)).filter(i => i < 0).length;
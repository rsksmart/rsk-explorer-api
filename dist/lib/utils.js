"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.isNullData = exports.sumDigits = exports.isBlockObject = exports.isValidBlockNumber = exports.jsonDecode = exports.jsonEncode = exports.keccak256 = exports.applyDecimals = exports.base64toHex = exports.btoa = exports.atob = exports.includesAll = exports.hasValue = exports.arraySymmetricDifference = exports.arrayDifference = exports.arrayIntersection = exports.getBestBlock = exports.blockQuery = exports.isBlockHash = exports.checkBlockHash = exports.serialize = exports.newBigNumber = exports.bigNumberDifference = exports.bigNumberSum = exports.bigNumberToSring = exports.unSerializeBigNumber = exports.isSerializedBigNumber = exports.serializeBigNumber = exports.isBigNumber = exports.bigNumberDoc = exports.isValidAddress = exports.isAddress = exports.remove0x = exports.add0x = exports.isHexString = void 0;var _bignumber = require("bignumber.js");
var _types = require("./types");
var _mongodb = require("mongodb");
var _keccak = _interopRequireDefault(require("keccak"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const isHexString = str => {
  str = str.substring(0, 2) === '0x' ? str.substring(2) : str;
  return /^[0-9a-f]+$/i.test(str);
};exports.isHexString = isHexString;

const add0x = str => {
  let s = str;
  let prefix = s[0] === '-' ? '-' : '';
  if (prefix) s = s.substring(prefix.length);
  if (isHexString(s) && s.substring(0, 2) !== '0x') {
    return `${prefix}0x${s}`;
  }
  return str;
};exports.add0x = add0x;

const remove0x = value => {
  if (!value) return value;
  if (typeof value === 'object') return value;
  if (typeof value === 'boolean') return value;
  if (value === '0x') return '';
  let s = `${value}`;
  let prefix = s[0] === '-' ? '-' : '';
  if (prefix) s = s.substring(prefix.length);
  if (isHexString(s)) {
    if (s.substring(0, 2) === '0x') return prefix + s.substr(2);
  }
  return value;
};exports.remove0x = remove0x;

const isAddress = address => {
  return /^(0x)?[0-9a-f]{40}$/i.test(address);
};exports.isAddress = isAddress;

const isValidAddress = address => {
  throw new Error('Not impemented');
};exports.isValidAddress = isValidAddress;

const bigNumberDoc = bigNumber => {
  return '0x' + bigNumber.toString(16);
};exports.bigNumberDoc = bigNumberDoc;

const isBigNumber = value => {
  return isObj(value) && (
  value._isBigNumber === true ||
  value.isBigNumber === true ||
  value instanceof _bignumber.BigNumber ||
  value.lte && value.toNumber);
};exports.isBigNumber = isBigNumber;

const serializeBigNumber = value => {
  return isBigNumber(value) ? bigNumberDoc(value) : value;
};exports.serializeBigNumber = serializeBigNumber;

const isSerializedBigNumber = value => {
  return value.type && value.value && value.type === _types.BIG_NUMBER;
};exports.isSerializedBigNumber = isSerializedBigNumber;

const unSerializeBigNumber = value => {
  return isSerializedBigNumber(value) ? new _bignumber.BigNumber(value.value) : value;
};exports.unSerializeBigNumber = unSerializeBigNumber;

const bigNumberToSring = bn => {
  if (bn.type && bn.type === _types.BIG_NUMBER) return bn.value;
  if (isBigNumber(bn)) return bn.toString();
  return bn;
};exports.bigNumberToSring = bigNumberToSring;

const bigNumberSum = values => {
  let total = new _bignumber.BigNumber(0);
  values.
  forEach(value => {
    value = newBigNumber(value);
    total = total.plus(value);
  });
  return total;
};exports.bigNumberSum = bigNumberSum;

const bigNumberDifference = (a, b) => {
  a = newBigNumber(a);
  b = newBigNumber(b);
  return a.minus(b);
};exports.bigNumberDifference = bigNumberDifference;

const newBigNumber = value => isBigNumber(value) ? value : new _bignumber.BigNumber(value);exports.newBigNumber = newBigNumber;

const isObj = value => {
  if (undefined === value || value === null) return false;
  let is = typeof value === 'object';
  is = is ? value instanceof Array === false : is;
  return is;
};

const serialize = obj => {
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(o => serialize(o));
  if (isBigNumber(obj)) return serializeBigNumber(obj);
  if (obj instanceof _mongodb.ObjectID) return obj.toString();
  let serialized = {};
  for (let p in obj) {
    let value = obj[p];
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
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
};exports.serialize = serialize;

const checkBlockHash = value => {
  value = String(value).toLowerCase();
  if (/^(0x)[0-9a-f]{64}$/.test(value)) return value;
  if (/^[0-9a-f]{64}$/.test(value)) return '0x' + value;
  return null;
};exports.checkBlockHash = checkBlockHash;

const isBlockHash = value => checkBlockHash(value) !== null;exports.isBlockHash = isBlockHash;

const blockQuery = blockHashOrNumber => {
  const hash = isBlockHash(blockHashOrNumber) ? blockHashOrNumber : null;
  const number = parseInt(blockHashOrNumber);
  if (hash) return { hash };
  if (number || number === 0) return { number };
  return null;
};exports.blockQuery = blockQuery;

const blockTotalDiff = block => bigNumberToSring(block.totalDifficulty);

const getBestBlock = blocks => {
  blocks.sort((a, b) => {
    let aDiff = blockTotalDiff(a);
    let bDiff = blockTotalDiff(b);
    if (aDiff > bDiff) return -1;
    if (aDiff < bDiff) return 1;
    return 0;
  });
  return blocks[0];
};exports.getBestBlock = getBestBlock;

const arrayIntersection = (a, b) => a.filter(v => b.includes(v));exports.arrayIntersection = arrayIntersection;

const arrayDifference = (a, b) => a.filter(x => !b.includes(x));exports.arrayDifference = arrayDifference;

const arraySymmetricDifference = (a, b) => arrayDifference(a, b).concat(b.filter(x => !a.includes(x)));exports.arraySymmetricDifference = arraySymmetricDifference;

const hasValue = (arr, search) => arrayIntersection(arr, search).length > 0;exports.hasValue = hasValue;

const includesAll = (arr, search) => !search.map(t => arr.indexOf(t)).filter(i => i < 0).length;exports.includesAll = includesAll;

const atob = str => Buffer.from(str, 'base64').toString('binary');exports.atob = atob;

const btoa = base64 => Buffer.from(base64, 'binary').toString('base64');exports.btoa = btoa;

const base64toHex = base64 => {
  let raw = atob(base64);
  return '0x' + [...new Array(raw.length)].map((c, i) => {
    let h = raw.charCodeAt(i).toString(16);
    return h.length === 2 ? h : `0${h}`;
  }).join('').toLowerCase();
};exports.base64toHex = base64toHex;

const applyDecimals = (value, decimals = 18) => {
  value = newBigNumber(value);
  const divisor = new _bignumber.BigNumber(10).exponentiatedBy(parseInt(decimals));
  const result = value.dividedBy(divisor);
  return result;
};exports.applyDecimals = applyDecimals;

const keccak256 = (input, format = 'hex') => (0, _keccak.default)('keccak256').update(input).digest(format);exports.keccak256 = keccak256;

const jsonEncode = value => btoa(JSON.stringify(value));exports.jsonEncode = jsonEncode;

const jsonDecode = value => JSON.parse(atob(value));exports.jsonDecode = jsonDecode;

const isValidBlockNumber = number => parseInt(number) === number && number >= 0;exports.isValidBlockNumber = isValidBlockNumber;

const isBlockObject = block => {
  if (typeof block !== 'object') return false;
  const { hash, number, transactions, miner } = block;
  if (!transactions) return false;
  return isBlockHash(hash) && isAddress(miner) && isValidBlockNumber(number);
};exports.isBlockObject = isBlockObject;

const sumDigits = value => `${value}`.split('').map(Number).reduce((a, b) => a + b, 0);exports.sumDigits = sumDigits;

const isNullData = value => {
  const test = value && remove0x(value);
  if (sumDigits(test) === 0) return true;
  return test === '' ? true : !test;
};exports.isNullData = isNullData;
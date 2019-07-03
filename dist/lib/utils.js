'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.isBlockObject = exports.isValidBlockNumber = exports.jsonDecode = exports.jsonEncode = exports.keccak256 = exports.applyDecimals = exports.base64toHex = exports.btoa = exports.atob = exports.includesAll = exports.hasValue = exports.arraySymmetricDifference = exports.arrayDifference = exports.arrayIntersection = exports.getBestBlock = exports.blockQuery = exports.isBlockHash = exports.checkBlockHash = exports.serialize = exports.newBigNumber = exports.bigNumberDifference = exports.bigNumberSum = exports.bigNumberToSring = exports.unSerializeBigNumber = exports.isSerializedBigNumber = exports.serializeBigNumber = exports.isBigNumber = exports.bigNumberDoc = exports.isValidAddress = exports.isAddress = exports.remove0x = exports.add0x = exports.isHexString = undefined;var _bignumber = require('bignumber.js');
var _types = require('./types');
var _mongodb = require('mongodb');
var _keccak = require('keccak');var _keccak2 = _interopRequireDefault(_keccak);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const isHexString = exports.isHexString = str => {
  str = str.substring(0, 2) === '0x' ? str.substring(2) : str;
  return (/^[0-9a-f]+$/i.test(str));
};

const add0x = exports.add0x = str => {
  let s = str;
  let prefix = s[0] === '-' ? '-' : '';
  if (prefix) s = s.substring(prefix.length);
  if (isHexString(s) && s.substring(0, 2) !== '0x') {
    return `${prefix}0x${s}`;
  }
  return str;
};

const remove0x = exports.remove0x = str => {
  let s = str;
  let prefix = s[0] === '-' ? '-' : '';
  if (prefix) s = s.substring(prefix.length);
  if (isHexString(s)) {
    if (s.substring(0, 2) === '0x') return prefix + s.substr(2);
  }
  return str;
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

const bigNumberSum = exports.bigNumberSum = values => {
  let total = new _bignumber.BigNumber(0);
  values.
  forEach(value => {
    value = newBigNumber(value);
    total = total.plus(value);
  });
  return total;
};

const bigNumberDifference = exports.bigNumberDifference = (a, b) => {
  a = newBigNumber(a);
  b = newBigNumber(b);
  return a.minus(b);
};

const newBigNumber = exports.newBigNumber = value => isBigNumber(value) ? value : new _bignumber.BigNumber(value);

const isObj = value => {
  if (undefined === value || value === null) return false;
  let is = typeof value === 'object';
  is = is ? value instanceof Array === false : is;
  return is;
};

const serialize = exports.serialize = obj => {
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

const arrayIntersection = exports.arrayIntersection = (a, b) => a.filter(v => b.includes(v));

const arrayDifference = exports.arrayDifference = (a, b) => a.filter(x => !b.includes(x));

const arraySymmetricDifference = exports.arraySymmetricDifference = (a, b) => arrayDifference(a, b).concat(b.filter(x => !a.includes(x)));

const hasValue = exports.hasValue = (arr, search) => arrayIntersection(arr, search).length > 0;

const includesAll = exports.includesAll = (arr, search) => !search.map(t => arr.indexOf(t)).filter(i => i < 0).length;

const atob = exports.atob = str => Buffer.from(str, 'base64').toString('binary');

const btoa = exports.btoa = base64 => Buffer.from(base64, 'binary').toString('base64');

const base64toHex = exports.base64toHex = base64 => {
  let raw = atob(base64);
  return '0x' + [...new Array(raw.length)].map((c, i) => {
    let h = raw.charCodeAt(i).toString(16);
    return h.length === 2 ? h : `0${h}`;
  }).join('').toLowerCase();
};

const applyDecimals = exports.applyDecimals = (value, decimals = 18) => {
  value = newBigNumber(value);
  const divisor = new _bignumber.BigNumber(10).exponentiatedBy(parseInt(decimals));
  const result = value.dividedBy(divisor);
  return result;
};

const keccak256 = exports.keccak256 = (input, format = 'hex') => (0, _keccak2.default)('keccak256').update(input).digest(format);

const jsonEncode = exports.jsonEncode = value => btoa(JSON.stringify(value));

const jsonDecode = exports.jsonDecode = value => JSON.parse(atob(value));

const isValidBlockNumber = exports.isValidBlockNumber = number => parseInt(number) === number && number >= 0;

const isBlockObject = exports.isBlockObject = block => {
  if (typeof block !== 'object') return false;
  const { hash, number, transactions, miner } = block;
  if (!transactions) return false;
  return isBlockHash(hash) && isAddress(miner) && isValidBlockNumber(number);
};
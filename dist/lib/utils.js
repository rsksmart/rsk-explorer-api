'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.keccak256 = exports.base64toHex = exports.btoa = exports.atob = exports.hasValues = exports.hasValue = exports.arraySymmetricDifference = exports.arrayDifference = exports.arrayIntersection = exports.getBestBlock = exports.blockQuery = exports.isBlockHash = exports.checkBlockHash = exports.serialize = exports.bigNumberToSring = exports.unSerializeBigNumber = exports.isSerializedBigNumber = exports.serializeBigNumber = exports.isBigNumber = exports.bigNumberDoc = exports.isValidAddress = exports.isAddress = exports.add0x = exports.isHexString = undefined;var _bignumber = require('bignumber.js');
var _types = require('./types');
var _keccak = require('keccak');var _keccak2 = _interopRequireDefault(_keccak);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const isHexString = exports.isHexString = str => {
  str = str.substring(0, 2) === '0x' ? str.substring(2) : str;
  return (/^[0-9a-f]+$/i.test(str));
};

const add0x = exports.add0x = str => isHexString(str) && str.substring(0, 2) !== '0x' ? `0x${str}` : str;

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

const arrayIntersection = exports.arrayIntersection = (a, b) => a.filter(v => b.includes(v));

const arrayDifference = exports.arrayDifference = (a, b) => a.filter(x => !b.includes(x));

const arraySymmetricDifference = exports.arraySymmetricDifference = (a, b) => arrayDifference(a, b).concat(b.filter(x => !a.includes(x)));

const hasValue = exports.hasValue = (arr, search) => arrayIntersection(arr, search).length > 0;

const hasValues = exports.hasValues = (arr, search) => !search.map(t => arr.indexOf(t)).filter(i => i < 0).length;

const atob = exports.atob = str => Buffer.from(str, 'base64').toString('binary');

const btoa = exports.btoa = str => Buffer.from(str, 'binary').toString('base64');

const base64toHex = exports.base64toHex = base64 => {
  let raw = atob(base64);
  return '0x' + [...new Array(raw.length)].map((c, i) => {
    let h = raw.charCodeAt(i).toString(16);
    return h.length === 2 ? h : `0${h}`;
  }).join('').toLowerCase();
};

const keccak256 = exports.keccak256 = (input, format = 'hex') => (0, _keccak2.default)('keccak256').update(input).digest(format);
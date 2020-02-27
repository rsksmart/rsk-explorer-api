"use strict";Object.defineProperty(exports, "__esModule", { value: true });var _exportNames = { bigNumberDoc: true, isBigNumber: true, serializeBigNumber: true, isSerializedBigNumber: true, unSerializeBigNumber: true, bigNumberToSring: true, bigNumberSum: true, bigNumberDifference: true, newBigNumber: true, isObj: true, serialize: true, checkBlockHash: true, isBlockHash: true, blockQuery: true, getBestBlock: true, applyDecimals: true, isValidBlockNumber: true, isBlockObject: true, toAscii: true };exports.toAscii = exports.isBlockObject = exports.isValidBlockNumber = exports.applyDecimals = exports.getBestBlock = exports.blockQuery = exports.isBlockHash = exports.checkBlockHash = exports.serialize = exports.isObj = exports.newBigNumber = exports.bigNumberDifference = exports.bigNumberSum = exports.bigNumberToSring = exports.unSerializeBigNumber = exports.isSerializedBigNumber = exports.serializeBigNumber = exports.isBigNumber = exports.bigNumberDoc = void 0;var _bignumber = require("bignumber.js");
var _types = require("./types");
var _mongodb = require("mongodb");
var _rskUtils = require("rsk-utils");
Object.keys(_rskUtils).forEach(function (key) {if (key === "default" || key === "__esModule") return;if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;Object.defineProperty(exports, key, { enumerable: true, get: function () {return _rskUtils[key];} });});

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
  return !Array.isArray(value) && typeof value === 'object' && value !== null;
};exports.isObj = isObj;

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

const applyDecimals = (value, decimals = 18) => {
  value = newBigNumber(value);
  const divisor = new _bignumber.BigNumber(10).exponentiatedBy(parseInt(decimals));
  const result = value.dividedBy(divisor);
  return result;
};exports.applyDecimals = applyDecimals;

const isValidBlockNumber = number => parseInt(number) === number && number >= 0;exports.isValidBlockNumber = isValidBlockNumber;

const isBlockObject = block => {
  if (typeof block !== 'object') return false;
  const { hash, number, transactions, miner } = block;
  if (!transactions) return false;
  return isBlockHash(hash) && (0, _rskUtils.isAddress)(miner) && isValidBlockNumber(number);
};exports.isBlockObject = isBlockObject;

const toAscii = hexString => (0, _rskUtils.toBuffer)((0, _rskUtils.remove0x)(hexString), 'hex').toString('ascii').replace(/\0/g, '');exports.toAscii = toAscii;
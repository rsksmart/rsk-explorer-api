"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.rskAddressFromBtcPublicKey = exports.compressPublic = exports.decompressPublic = exports.parsePublic = exports.pubToAddress = exports.h160toAddress = exports.h160 = exports.sha256 = void 0;var _crypto = _interopRequireDefault(require("crypto"));
var bs58 = _interopRequireWildcard(require("bs58"));
var _utils = require("./utils");
var _secp256k = _interopRequireDefault(require("secp256k1"));function _getRequireWildcardCache() {if (typeof WeakMap !== "function") return null;var cache = new WeakMap();_getRequireWildcardCache = function () {return cache;};return cache;}function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;}var cache = _getRequireWildcardCache();if (cache && cache.has(obj)) {return cache.get(obj);}var newObj = {};if (obj != null) {var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) {var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;if (desc && (desc.get || desc.set)) {Object.defineProperty(newObj, key, desc);} else {newObj[key] = obj[key];}}}}newObj.default = obj;if (cache) {cache.set(obj, newObj);}return newObj;}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const PREFIXES = {
  mainnet: {
    pubKeyHash: '00',
    scriptHash: '05' },

  testnet: {
    pubKeyHash: '6F',
    scriptHash: 'C4' } };


const getNetPrefix = netName => {
  let prefixes = PREFIXES[netName];
  if (!prefixes) throw new Error(`Unknown network ${netName}`);
  return prefixes;
};

const createHash = (a, val, from = 'hex', to = 'hex') => _crypto.default.createHash(a).update(val, from).digest(to);

const sha256 = (val, from, to) => createHash('sha256', (0, _utils.remove0x)(val), from, to);exports.sha256 = sha256;

const h160 = (val, from, to) => createHash('ripemd160', (0, _utils.remove0x)(val), from, to);exports.h160 = h160;

const h160toAddress = (hash160, { network, prefixKey }) => {
  network = network || 'mainnet';
  prefixKey = prefixKey || 'pubKeyHash';
  const prefix = getNetPrefix(network)[prefixKey];
  hash160 = Buffer.isBuffer(hash160) ? hash160.toString('hex') : (0, _utils.remove0x)(hash160);
  hash160 = `${prefix}${hash160}`;
  let check = sha256(sha256(hash160)).slice(0, 8);
  return bs58.encode(Buffer.from(`${hash160}${check}`, 'hex'));
};exports.h160toAddress = h160toAddress;

const pubToAddress = (pub, network) => {
  return h160toAddress(h160(sha256((0, _utils.remove0x)(pub))), { network });
};exports.pubToAddress = pubToAddress;

const parsePublic = (pub, compressed) => {
  pub = !Buffer.isBuffer(pub) ? Buffer.from((0, _utils.remove0x)(pub), 'hex') : pub;
  return _secp256k.default.publicKeyConvert(pub, compressed);
};exports.parsePublic = parsePublic;

const decompressPublic = compressed => parsePublic(compressed, false).toString('hex');exports.decompressPublic = decompressPublic;

const compressPublic = pub => parsePublic(pub, true).toString('hex');exports.compressPublic = compressPublic;

const rskAddressFromBtcPublicKey = cpk => (0, _utils.add0x)((0, _utils.keccak256)(parsePublic(cpk, false).slice(1)).slice(-40));exports.rskAddressFromBtcPublicKey = rskAddressFromBtcPublicKey;
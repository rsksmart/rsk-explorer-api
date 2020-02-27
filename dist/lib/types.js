"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.bitcoinRskNetWorks = exports.bitcoinNetworks = exports.EVMversions = exports.fields = exports.TOTAL_SUPPLY = exports.OBJECT_ID = exports.BIG_NUMBER = exports.MODULES = exports.actions = exports.events = exports.tokensInterfaces = exports.contractsInterfaces = exports.addrTypes = exports.errors = exports.txTypes = void 0;var _errors = require("../lib/errors");

const txTypes = {
  default: 'normal',
  remasc: 'remasc',
  bridge: 'bridge',
  contract: 'contract deploy' };exports.txTypes = txTypes;


const errors = (0, _errors.apiErrors)(
{
  INVALID_REQUEST: 'Invalid Request',
  INVALID_TYPE: 'Invalid Type',
  EMPTY_RESULT: 'Not Found',
  TEMPORARILY_UNAVAILABLE: 'Service temporarily unavailable',
  UPDATING_REGISTRY: 'Updating registry' });exports.errors = errors;



const addrTypes = {
  ADDRESS: 'account',
  CONTRACT: 'contract' };exports.addrTypes = addrTypes;


const contractsInterfaces = {
  ERC20: 'ERC20',
  ERC677: 'ERC677',
  ERC165: 'ERC165',
  ERC721: 'ERC721' };exports.contractsInterfaces = contractsInterfaces;


const ci = contractsInterfaces;

const tokensInterfaces = [
ci.ERC20,
ci.ERC677,
ci.ERC721];exports.tokensInterfaces = tokensInterfaces;


const events = {
  'BLOCK_QUEUED': 'blockQueued',
  'BLOCK_REQUESTED': 'blockRequested',
  'NEW_BLOCK': 'newBlock',
  'BLOCK_ERROR': 'blockError',
  'QUEUE_DONE': 'queueDone' };exports.events = events;


const actions = {
  'BULK_BLOCKS_REQUEST': 'bulkRequest',
  'BLOCK_REQUEST': 'requestBlock',
  'STATUS_UPDATE': 'updateStatus',
  'CHECK_DB': 'checkDB',
  'CHECK_TIP': 'checkBcTip',
  'UPDATE_TIP_BLOCK': 'updateTipBlock' };exports.actions = actions;


const MODULES = {
  blocks: 'Block',
  transactions: 'Tx',
  addresses: 'Address',
  events: 'Event',
  tokens: 'Token',
  stats: 'Stats',
  summary: 'Summary',
  txPending: 'TxPending',
  extendedStats: 'ExtendedStats',
  contractVerifier: 'ContractVerification' };exports.MODULES = MODULES;


const BIG_NUMBER = 'BigNumber';exports.BIG_NUMBER = BIG_NUMBER;

const OBJECT_ID = 'ObjectID';exports.OBJECT_ID = OBJECT_ID;

const TOTAL_SUPPLY = 21 * 10 ** 6;exports.TOTAL_SUPPLY = TOTAL_SUPPLY;

const fields = {
  LAST_BLOCK_MINED: 'lastBlockMined' };exports.fields = fields;


const EVMversions = [
'homestead',
'tangerineWhistle',
'spuriousDragon',
'byzantium',
'constantinople',
'petersburg'];exports.EVMversions = EVMversions;

const bitcoinNetworks = {
  TESTNET: 'testnet',
  MAINNET: 'mainnet' };exports.bitcoinNetworks = bitcoinNetworks;


const bitcoinRskNetWorks = {
  31: bitcoinNetworks.TESTNET,
  30: bitcoinNetworks.MAINNET };exports.bitcoinRskNetWorks = bitcoinRskNetWorks;var _default =


{ txTypes, errors, addrTypes, contractsInterfaces };exports.default = _default;
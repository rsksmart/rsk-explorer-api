'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.BIG_NUMBER = exports.REMASC_NAME = exports.BRIDGE_NAME = exports.modules = exports.actions = exports.events = exports.tokensInterfaces = exports.contractsInterfaces = exports.addrTypes = exports.errors = exports.txTypes = undefined;var _errors = require('../lib/errors');

const txTypes = exports.txTypes = {
  default: 'normal',
  remasc: 'remasc',
  bridge: 'bridge',
  contract: 'contract deploy' };


const errors = exports.errors = (0, _errors.apiErrors)(
{
  INVALID_REQUEST: 'Invalid Request',
  INVALID_TYPE: 'Invalid Type',
  EMPTY_RESULT: 'Not Found',
  TEMPORARILY_UNAVAILABLE: 'Service temporarily unavailable',
  UPDATING_REGISTRY: 'Updating registry' });



const addrTypes = exports.addrTypes = {
  ADDRESS: 'account',
  CONTRACT: 'contract' };


const contractsInterfaces = exports.contractsInterfaces = {
  ERC20: 'ERC20',
  ERC677: 'ERC677',
  ERC165: 'ERC165',
  ERC721: 'ERC721' };


const ci = contractsInterfaces;

const tokensInterfaces = exports.tokensInterfaces = [
ci.ERC20,
ci.ERC677,
ci.ERC721];


const events = exports.events = {
  'BLOCK_QUEUED': 'blockQueued',
  'BLOCK_REQUESTED': 'blockRequested',
  'NEW_BLOCK': 'newBlock',
  'BLOCK_ERROR': 'blockError',
  'QUEUE_DONE': 'queueDone' };


const actions = exports.actions = {
  'BULK_BLOCKS_REQUEST': 'bulkRequest',
  'BLOCK_REQUEST': 'requestBlock',
  'STATUS_UPDATE': 'updateStatus',
  'CHECK_DB': 'checkDB',
  'CHECK_TIP': 'checkBcTip',
  'UPDATE_TIP_BLOCK': 'updateTipBlock' };


const modules = exports.modules = {
  blocks: 'Block',
  txs: 'Tx',
  addresses: 'Address',
  events: 'Event',
  tokens: 'Token' };


const BRIDGE_NAME = exports.BRIDGE_NAME = 'bridge (native)';

const REMASC_NAME = exports.REMASC_NAME = 'remasc (native)';

const BIG_NUMBER = exports.BIG_NUMBER = 'BigNumber';exports.default =

{ txTypes, errors, addrTypes, contractsInterfaces };
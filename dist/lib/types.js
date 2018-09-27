'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.BIG_NUMBER = exports.actions = exports.events = exports.contractsTypes = exports.addrTypes = exports.errors = exports.txTypes = undefined;var _errors = require('../lib/errors');

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


const contractsTypes = exports.contractsTypes = {
  ERC20: 'ERC20' };


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


const BIG_NUMBER = exports.BIG_NUMBER = 'BigNumber';exports.default =

{ txTypes, errors, addrTypes, contractsTypes };
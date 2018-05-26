'use strict';Object.defineProperty(exports, "__esModule", { value: true });
const txTypes = exports.txTypes = {
  default: 'normal',
  remasc: 'remasc',
  bridge: 'bridge',
  contract: 'contract deploy' };


const errors = exports.errors = {
  INVALID_REQUEST: 'Invalid Request',
  INVALID_TYPE: 'Invalid Type',
  EMPTY_RESULT: 'Not Found' };


const addrTypes = exports.addrTypes = {
  ADDRESS: 'account',
  CONTRACT: 'contract' };


const contractsTypes = exports.contractsTypes = {
  ERC20: 'ERC20' };exports.default =


{ txTypes, errors, addrTypes, contractsTypes };
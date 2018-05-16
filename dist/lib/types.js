'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
const txTypes = exports.txTypes = {
  default: 'normal',
  remasc: 'remasc',
  bridge: 'bridge',
  contract: 'contract deploy'
};

const errors = exports.errors = {
  INVALID_REQUEST: 'Invalid Request',
  INVALID_TYPE: 'Invalid Type',
  EMPTY_RESULT: 'Not Found'
};

exports.default = { txTypes, errors };
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _default = {
  /*   Address: {
                                                                                                                         getAddress: {
                                                                                                                           fields: ['balance', 'txBalance'],
                                                                                                                           action: 'updateAddress',
                                                                                                                           runIfEmpty: true
                                                                                                                         }
                                                                                                                       }, */
  ContractVerification: {
    getVersions: {
      action: 'getVersions',
      registry: true,
      runIfEmpty: true },

    verify: {
      action: 'requestVerification',
      registry: true,
      runIfEmpty: true } } };exports.default = _default;
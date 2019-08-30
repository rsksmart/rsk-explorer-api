"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.ContractVerification = void 0;var _DataCollector = require("../lib/DataCollector");
var _StoredConfig = require("../../lib/StoredConfig");
var _ContractVerifierModule = require("../../services/userEvents/ContractVerifierModule");
var _Errors = require("../lib/Errors");
var _mongodb = require("mongodb");
var _types = require("../../lib/types");

class ContractVerification extends _DataCollector.DataCollectorItem {
  constructor(collections, name) {
    const { ContractVerification, VerificationsResults } = collections;
    super(ContractVerification, name);
    this.verificationsCollection = VerificationsResults;
    this.publicActions = {
      verify: async params => {
        try {
          const { request } = params;
          if (!request) throw new _Errors.InvalidAddressError();
          const { address } = request;
          const aData = await this.parent.getModule('Address').run('getCode', { address });
          const { data } = aData;
          if (!data) throw new _Errors.Error400('Unknown address or address is not a contract');

          // TODO Check if has pending verifications

          const { creationCode, code } = data;
          if (!creationCode) throw new _Errors.Error404('Contract creation data not found');

          // Contract verifier payload
          request.bytecode = creationCode;
          request.deployedBytecode = code;
          return { data: request };
        } catch (err) {
          return Promise.reject(err);
        }
      },

      getSolcVersions: async () => {
        const data = await (0, _StoredConfig.StoredConfig)(this.parent.db).get(_ContractVerifierModule.versionsId);
        return { data };
      },

      getEvmVersions: async () => {
        const data = _types.EVMversions;
        return { data };
      },

      getVerificationResult: async params => {
        try {
          let { id } = params;
          if (!id) throw new Error('Invalid id');
          const _id = (0, _mongodb.ObjectID)(id);
          const verification = await this.getOne({ _id });
          if (verification && verification.data) {
            const { result, match } = verification.data;
            return { data: { result, match } };
          }
        } catch (err) {
          return Promise.reject(err);
        }
      },

      /*  getVerifications: async (params) => {
            const query = verificationQuery(params)
            const data = await this.getPageData(query)
            return { data }
          },
          getLatestVerification: async (params) => {
            const query = verificationQuery(params)
            return this.getLatest(query)
          }, */

      isVerified: async params => {
        const { address } = params;
        const data = await this.verificationsCollection.findOne({ address });
        return { data };
      } };

  }}


/* function verificationQuery (params) {
       const { address, match } = params
       const query = (undefined !== match) ? { address, match: !!match } : { address }
       return query
     } */exports.ContractVerification = ContractVerification;var _default =

ContractVerification;exports.default = _default;
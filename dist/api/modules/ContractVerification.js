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
      /**
                            * @swagger
                            * /api?module=contractVerifier&action=verify:
                            *    get:
                            *      description: Verify contract source
                            *      tags:
                            *        - contract verifier
                            *      parameters:
                            *        - name: request
                            *          in: query
                            *          required: true
                            *      responses:
                            *        200:
                            *          $ref: '#/definitions/Response'
                            *        400:
                            *          $ref: '#/responses/BadRequest'
                            *        404:
                            *          $ref: '#/responses/NotFound'
                            */
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
      /**
          * @swagger
          * /api?module=contractVerifier&action=getSolcVersions:
          *    get:
          *      description: Gets solidity compiler versions
          *      tags:
          *        - contract verifier
          *      responses:
          *        200:
          *          $ref: '#/definitions/Response'
          *        400:
          *          $ref: '#/responses/BadRequest'
          *        404:
          *          $ref: '#/responses/NotFound'
          */
      getSolcVersions: async () => {
        const data = await (0, _StoredConfig.StoredConfig)(this.parent.db).get(_ContractVerifierModule.versionsId);
        return { data };
      },
      /**
          * @swagger
          * /api?module=contractVerifier&action=getEvmVersions:
          *    get:
          *      description: Gets evm versions
          *      tags:
          *        - contract verifier
          *      responses:
          *        200:
          *          $ref: '#/definitions/Response'
          *        400:
          *          $ref: '#/responses/BadRequest'
          *        404:
          *          $ref: '#/responses/NotFound'
          */
      getEvmVersions: async () => {
        const data = _types.EVMversions;
        return { data };
      },
      /**
          * @swagger
          * /api?module=contractVerifier&action=getVersificationResult:
          *    get:
          *      description: Gets the result of source code verification
          *      tags:
          *        - contract verifier
          *      parameters:
          *        - name: id
          *          in: query
          *          required: true
          *      responses:
          *        200:
          *          $ref: '#/definitions/Response'
          *        400:
          *          $ref: '#/responses/BadRequest'
          *        404:
          *          $ref: '#/responses/NotFound'
          */
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
      /**
          * @swagger
          * /api?module=contractVerifier&action=isVerified:
          *    get:
          *      description: Checks if a contract was verified
          *      tags:
          *        - contract verifier
          *      parameters:
          *        - name: address
          *          in: query
          *          required: true
          *      responses:
          *        200:
          *          $ref: '#/definitions/Response'
          *        400:
          *          $ref: '#/responses/BadRequest'
          *        404:
          *          $ref: '#/responses/NotFound'
          */
      isVerified: async params => {
        const { address } = params;
        const data = await this.verificationsCollection.findOne({ address });
        return { data };
      } };

  }}exports.ContractVerification = ContractVerification;var _default =


ContractVerification;exports.default = _default;
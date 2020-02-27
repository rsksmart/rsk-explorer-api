"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.Address = void 0;var _DataCollector = require("../lib/DataCollector");
var _types = require("../../lib/types");

class Address extends _DataCollector.DataCollectorItem {
  constructor({ Addrs }, name) {
    let sortable = { 'createdByTx.timestamp': -1 };
    super(Addrs, name, { sortDir: 1, sortable });
    this.fields = { code: 0, 'createdByTx.input': 0 };
    this.publicActions = {
      /**
                            * @swagger
                            * /api?module=addresses&action=getAddress:
                            *    get:
                            *      description: get address data
                            *      tags:
                            *        - addresses
                            *      parameters:
                            *        - name: module
                            *          in: query
                            *          required: true
                            *          enum: [addresses]
                            *        - name: action
                            *          in: query
                            *          required: true
                            *          enum: [getAddress]
                            *        - $ref: '#/parameters/address'
                            *      responses:
                            *        200:
                            *          $ref: '#/definitions/Response'
                            *        400:
                            *          $ref: '#/responses/BadRequest'
                            *        404:
                            *          $ref: '#/responses/NotFound'
                             */

      getAddress: async params => {
        const { address } = params;
        const aData = await this.getOne({ address }, { _id: 0 });
        if (aData && aData.data) {
          let { data } = aData;
          if (data.type === _types.addrTypes.CONTRACT) {
            const verified = await this.parent.getModule('ContractVerification').
            run('isVerified', { address, match: true });
            if (verified) data.verification = verified.data;
          }
          aData.data = data;
        }
        return aData;
      },
      /**
          * @swagger
          * /api?module=addresses&action=getAddresses:
          *    get:
          *      description: get list of addresses
          *      tags:
          *        - addresses
          *      parameters:
          *        - name: module
          *          in: query
          *          required: true
          *          enum: [addresses]
          *        - name: action
          *          in: query
          *          required: true
          *          enum: [getAddresses]
          *        - $ref: '#/parameters/limit'
          *        - $ref: '#/parameters/next'
          *        - $ref: '#/parameters/prev'
          *      responses:
          *        200:
          *          $ref: '#/definitions/ResponseList'
          *        400:
          *          $ref: '#/responses/BadRequest'
          *        404:
          *          $ref: '#/responses/NotFound'
          */
      getAddresses: params => {
        let type = params.query ? params.query.type : null;
        let query = type ? { type } : {};
        return this.getPageData(query, params);
      },
      /**
          * @swagger
          * /api?module=addresses&action=getMiners:
          *    get:
          *      description: get list of miners
          *      tags:
          *        - addresses
          *      parameters:
          *        - name: module
          *          in: query
          *          required: true
          *          enum: [addresses]
          *        - name: action
          *          in: query
          *          required: true
          *          enum: [getMiners]
          *        - name: fromBlock
          *          in: query
          *          required: false
          *        - $ref: '#/parameters/limit'
          *        - $ref: '#/parameters/next'
          *        - $ref: '#/parameters/prev'
          *      responses:
          *        200:
          *          $ref: '#/definitions/ResponseList'
          *        400:
          *          $ref: '#/responses/BadRequest'
          *        404:
          *          $ref: '#/responses/NotFound'
          */
      getMiners: params => {
        let query = {};
        const lbMined = _types.fields.LAST_BLOCK_MINED;
        let { fromBlock } = params;
        query[lbMined] = { $exists: true, $ne: null };
        if (fromBlock) {
          fromBlock = parseInt(fromBlock);
          query[`${lbMined}.number`] = { $gt: fromBlock };
        }
        return this.getPageData(query, params);
      },
      /**
          * @swagger
          * /api?module=addresses&action=getTokens:
          *    get:
          *      description: get list of tokens
          *      tags:
          *        - addresses
          *      parameters:
          *        - name: module
          *          in: query
          *          required: true
          *          enum: [addresses]
          *        - name: action
          *          in: query
          *          required: true
          *          enum: [getTokens]
          *        - $ref: '#/parameters/limit'
          *        - $ref: '#/parameters/next'
          *        - $ref: '#/parameters/prev'
          *      responses:
          *        200:
          *          $ref: '#/definitions/ResponseList'
          *        400:
          *          $ref: '#/responses/BadRequest'
          *        404:
          *          $ref: '#/responses/NotFound'
          */
      getTokens: params => {
        return this.getPageData({
          type: _types.addrTypes.CONTRACT,
          contractInterfaces: { $in: _types.tokensInterfaces } },
        params);
      },
      /**
          * @swagger
          * /api?module=addresses&action=getCirculatingSupply:
          *    get:
          *      description: get list of tokens
          *      tags:
          *        - addresses
          *      parameters:
          *        - name: module
          *          in: query
          *          required: true
          *          enum: [addresses]
          *        - name: action
          *          in: query
          *          required: true
          *          enum: [getCirculatingSupply]
          *      responses:
          *        200:
          *          $ref: '#/definitions/Response'
          *        400:
          *          $ref: '#/responses/BadRequest'
          *        404:
          *          $ref: '#/responses/NotFound'
          */
      getCirculatingSupply: params => {
        return this.parent.getCirculatingSupply();
      },
      /**
            * @swagger
            * /api?module=addresses&action=getCode:
            *    get:
            *      description: get contract code
            *      tags:
            *        - addresses
            *      parameters:
            *        - name: module
            *          in: query
            *          required: true
            *          enum: [addresses]
            *        - name: action
            *          in: query
            *          required: true
            *          enum: [getCode]
            *        - $ref: '#/parameters/address'
            *      responses:
            *        200:
            *          $ref: '#/definitions/Response'
            *        400:
            *          $ref: '#/responses/BadRequest'
            *        404:
            *          $ref: '#/responses/NotFound'
            */
      getCode: async params => {
        try {
          const { address } = params;
          const fields = { _id: 0, address: 1, code: 1, createdByTx: 1, contractInterfaces: 1, name: 1 };
          const result = await this.getOne({ address }, fields);
          let { data } = result;
          if (!data) throw new Error('Unknown address');
          const { createdByTx, code } = data;
          if (!code) throw new Error('The address does not have code');
          if (createdByTx) {
            data.creationCode = createdByTx.input;
            data.created = createdByTx.timestamp;
            delete data.createdByTx;
          }
          return result;
        } catch (err) {
          return Promise.reject(err);
        }
      },
      /**
          * @swagger
          * /api?module=addresses&action=findAddresses:
          *    get:
          *      description: find addresses by name
          *      tags:
          *        - addresses
          *      parameters:
          *        - name: module
          *          in: query
          *          required: true
          *          enum: [addresses]
          *        - name: action
          *          in: query
          *          required: true
          *        - name: name
          *          required: true
          *      responses:
          *        200:
          *          $ref: '#/definitions/Response'
          *        400:
          *          $ref: '#/responses/BadRequest'
          *        404:
          *          $ref: '#/responses/NotFound'
          */
      findAddresses: async params => {
        let { name } = params;
        params.field = 'name';
        params.sort = { _id: 1 };
        return this.textSearch(name, params);
      } };

  }}exports.Address = Address;var _default =


Address;exports.default = _default;
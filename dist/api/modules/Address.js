'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Address = undefined;var _DataCollector = require('../lib/DataCollector');
var _types = require('../../lib/types');
var _config = require('../../lib/config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const { bridgeAddress, remascAddress } = _config2.default;

class Address extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    let sortable = { 'createdByTx.timestamp': -1 };
    super(collection, key, parent, { sortDir: 1, sortable });
    const Tx = this.parent.getItem({ key: 'Tx' });
    this.Tx = Tx;
    this.fields = { code: 0 };
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
        const aData = await this.getOne({ address });
        if (aData.data) {
          if (!aData.data.name) {
            if (address === remascAddress) aData.data.name = _types.REMASC_NAME;
            if (address === bridgeAddress) aData.data.name = _types.BRIDGE_NAME;
          }
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
        query[lbMined] = { $exists: true };
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
      } };

  }}exports.Address = Address;exports.default =


Address;
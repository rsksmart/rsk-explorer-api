"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.InternalTx = void 0;var _DataCollector = require("../lib/DataCollector");
var _utils = require("../../lib/utils");

class InternalTx extends _DataCollector.DataCollectorItem {
  constructor(collections, key) {
    const { InternalTransactions } = collections;
    let cursorField = 'internalTxId';
    let sortDir = -1;
    const sortable = { internalTxId: -1 };
    super(InternalTransactions, key, { cursorField, sortDir, sortable });
    this.publicActions = {
      /**
                           * @swagger
                           * /api?module=internalTransactions&action=getInternalTransaction:
                           *    get:
                           *      description: get internal transaction
                           *      tags:
                           *        - internal transactions
                           *      produces:
                           *        - application/json
                           *      parameters:
                           *        - name: module
                           *          in: query
                           *          required: true
                           *          enum: [internalTransactions]
                           *        - name: action
                           *          in: query
                           *          required: true
                           *          enum: [getInternalTransaction]
                           *        - name: eventId
                           *          in: query
                           *          schema:
                           *            type: string
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
      getInternalTransaction: params => {
        let { internalTxId } = params;
        return this.getItem({ internalTxId }, params);
      },
      /**
         * @swagger
         * /api?module=internalTransactions&action=getInternalTransactions:
         *    get:
         *      description: get internal transactions
         *      tags:
         *        - internal transactions
         *      produces:
         *        - application/json
         *      parameters:
         *        - name: module
         *          in: query
         *          required: true
         *          enum: [internalTransactions]
         *        - name: action
         *          in: query
         *          required: true
         *          enum: [getInternalTransactions]
         *        - name: query
         *          in: query
         *          required: false
         *          schema:
         *            type: object
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
      getInternalTransactions: params => {
        let query = {};
        return this.getPageData(query, params);
      },
      /**
         * @swagger
         * /api?module=internalTransactions&action=getInternalTransactionsByAddress:
         *    get:
         *      description: get internal transactions by address
         *      tags:
         *       - internal transactions
         *      parameters:
         *        - name: module
         *          in: query
         *          required: true
         *          enum: [internalTransactions]
         *        - name: action
         *          in: query
         *          required: true
         *          enum: [getInternalTransactionsByAddress]
         *        - $ref: '#/parameters/address'
         *      responses:
         *        200:
         *          $ref: '#/definitions/ResponseList'
         *        400:
         *          $ref: '#/responses/BadRequest'
         *        404:
         *          $ref: '#/responses/NotFound'
         */
      getInternalTransactionsByAddress: params => {
        const { address } = params;
        return this.getPageData(
        {
          $or: [{ 'action.from': address }, { 'action.to': address }] },

        params);

      },
      /**
         * @swagger
         * /api?module=internalTransactions&action=getInternalTransactionsByBlock:
         *    get:
         *      description: get internal transactions by block
         *      tags:
         *        - internal transactions
         *      parameters:
         *        - name: module
         *          in: query
         *          required: true
         *          enum: [internalTransactions]
         *        - name: action
         *          in: query
         *          required: true
         *          enum: [getInternalTransactionsByBlock]
         *        - $ref: '#/parameters/hashOrNumber'
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
      getInternalTransactionsByBlock: params => {
        const hashOrNumber = params.hashOrNumber || params.number;

        if ((0, _utils.isBlockHash)(hashOrNumber)) {
          params.blockHash = hashOrNumber;
          return this.getInternalTransactionsByBlockHash(params);
        } else {
          params.blockNumber = parseInt(hashOrNumber);
          return this.getInternalTransactionsByBlockNumber(params);
        }
      },
      /**
         * @swagger
         * /api?module=internalTransactions&action=getInternalTransactionsByTxHash:
         *    get:
         *      description: get internal transactions by tx hash
         *      tags:
         *        - internal transactions
         *      parameters:
         *        - name: module
         *          in: query
         *          required: true
         *          enum: [internalTransactions]
         *        - name: action
         *          in: query
         *          required: true
         *          enum: [getInternalTransactionsByTxHash]
         *        - $ref: '#/parameters/transactionHash'
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
      getInternalTransactionsByTxHash: params => {
        let { transactionHash, hash } = params;
        transactionHash = transactionHash || hash;
        const query = { transactionHash };
        return this.getPageData(query, params);
      } };

  }
  getInternalTransactionsByBlockNumber(params) {
    const blockNumber = parseInt(params.blockNumber || params.number);
    if (undefined !== blockNumber) {
      return this.getPageData({ blockNumber }, params);
    }
  }

  getInternalTransactionsByBlockHash(params) {
    const blockHash = params.blockHash;
    if (blockHash) {
      return this.getPageData({ blockHash }, params);
    }
  }}exports.InternalTx = InternalTx;var _default =


InternalTx;exports.default = _default;
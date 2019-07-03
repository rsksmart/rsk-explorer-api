'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Stats = undefined;var _DataCollector = require('../lib/DataCollector');

class Stats extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.publicActions = {
      /**
                            * @swagger
                            * /api?module=stats&action=getStats:
                            *    get:
                            *      description: get stats
                            *      tags:
                            *        - stats
                            *      parameters:
                            *        - name: module
                            *          in: query
                            *          required: true
                            *          enum: [stats]
                            *        - name: action
                            *          in: query
                            *          required: true
                            *          enum: [getStats]
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
      getStats: params => {
        return this.getPageData({}, params);
      },
      /**
          * @swagger
          * /api?module=stats&action=getLatest:
          *    get:
          *      description: get stats
          *      tags:
          *        - stats
          *      parameters:
          *        - name: module
          *          in: query
          *          required: true
          *          enum: [stats]
          *        - name: action
          *          in: query
          *          required: true
          *          enum: [getLatest]
          *      responses:
          *        200:
          *          $ref: '#/definitions/Response'
          *        400:
          *          $ref: '#/responses/BadRequest'
          *        404:
          *          $ref: '#/responses/NotFound'
          */
      getLatest: () => {
        return this.getOne();
      } };

  }}exports.Stats = Stats;exports.default =


Stats;
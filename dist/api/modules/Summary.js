"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.Summary = void 0;var _DataCollector = require("../lib/DataCollector");
var _utils = require("../../lib/utils");
class Summary extends _DataCollector.DataCollectorItem {
  constructor({ BlocksSummary }, key) {
    let cursorField = '_id';
    let sortDir = -1;
    let sortable = { timestamp: -1 };
    super(BlocksSummary, key, { sortDir, cursorField, sortable });
    this.publicActions = {
      /**
                            * @swagger
                            * /api?module=summary&action=getSummary:
                            *    get:
                            *      description: get block summary
                            *      tags:
                            *        - summary
                            *      parameters:
                            *        - name: module
                            *          in: query
                            *          required: true
                            *          enum: [summary]
                            *        - name: action
                            *          in: query
                            *          required: true
                            *          enum: [getSummary]
                            *        - name: hash
                            *          description: block hash
                            *          in: query
                            *          schema:
                            *            type: string
                            *            example:
                            *      responses:
                            *        200:
                            *          $ref: '#/definitions/Response'
                            *        400:
                            *          $ref: '#/responses/BadRequest'
                            *        404:
                            *          $ref: '#/responses/NotFound'
                            */

      getSummary: params => {
        const { hash } = params;
        if ((0, _utils.isBlockHash)(hash)) {
          let query = { hash };
          return this.getPrevNext(query, { number: 1 });
        }
      },
      /**
          * @swagger
          * /api?module=summary&action=getSummaries:
          *    get:
          *      description: get list of summaries
          *      tags:
          *        - summary
          *      parameters:
          *        - name: module
          *          in: query
          *          required: true
          *          enum: [summary]
          *        - name: action
          *          in: query
          *          required: true
          *          enum: [getSummaries]
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

      getSummaries: params => {
        return this.getPageData({}, params);
      } };

  }}exports.Summary = Summary;var _default =


Summary;exports.default = _default;
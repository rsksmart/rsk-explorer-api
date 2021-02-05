"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.VerificationResults = void 0;var _DataCollector = require("../lib/DataCollector");

class VerificationResults extends _DataCollector.DataCollectorItem {
  constructor(collections, name) {
    const { VerificationsResults } = collections;
    super(VerificationsResults, name);
    this.publicActions = {
      /**
      * @swagger
      * /api?module=verificationResults&action=getResults:
      *    get:
      *      description: Gets a list of verified contracts addresses
      *      tags:
      *         - verification results
      *      responses:
      *        200:
      *          $ref: '#/definitions/Response'
      *        400:
      *          $ref: '#/responses/BadRequest'
      *        404:
      *          $ref: '#/responses/NotFound'
      */
      getResults: params => {
        params.fields = { address: 1 };
        let query = { match: true };
        return this.getPageData(query, params);
      },
      /**
       * @swagger
       * /api?module=verificationResults&action=getVerification:
       *    get:
       *      description: Checks if a contract was verified
       *      tags:
       *        - verification results
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
      getVerification: async params => {
        const { address, fields } = params;
        const query = { address, match: true };
        return this.getOne(query, fields);
      } };

  }}exports.VerificationResults = VerificationResults;var _default =


VerificationResults;exports.default = _default;
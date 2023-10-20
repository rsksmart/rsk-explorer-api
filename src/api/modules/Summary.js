import { DataCollectorItem } from '../lib/DataCollector'
import { isBlockHash } from '../../lib/utils'
export class Summary extends DataCollectorItem {
  constructor (key) {
    const cursorField = 'blockNumber'
    const sortDir = -1
    const sortable = { [cursorField]: -1 }
    super(key, { sortDir, cursorField, sortable })
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
        const { hash } = params
        if (isBlockHash(hash)) {
          let query = { hash }
          return this.getPrevNext(query, { blockNumber: 1 })
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
        return this.getPageData({}, params)
      }
    }
  }
}

export default Summary

import { DataCollectorItem } from '../lib/DataCollector'
import { isBlockHash } from '../../lib/utils'
export class Block extends DataCollectorItem {
  constructor (collection, key, parent) {
    let cursorField = 'number'
    let sortDir = -1
    let sortable = { timestamp: -1 }
    super(collection, key, parent, { sortDir, cursorField, sortable })
    this.publicActions = {
      /**
       * @swagger
       * /api?module=blocks&action=getBlock:
       *    get:
       *      description: get block data
       *      tags:
       *        - blocks
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [blocks]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getBlock]
       *        - name: hashOrNumber
       *          in: query
       *          schema:
       *            type: string
       *            example: 200
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */

      getBlock: params => {
        const hashOrNumber = params.hashOrNumber || params.hash || params.number
        let query = {}
        if (isBlockHash(hashOrNumber)) {
          query = { hash: hashOrNumber }
        } else {
          query = { number: parseInt(hashOrNumber) }
        }
        return this.getPrevNext(query, { number: 1 })
      },
      /**
       * @swagger
       * /api?module=blocks&action=getBlocks:
       *    get:
       *      description: get list of blocks
       *      tags:
       *        - blocks
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [blocks]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getBlocks]
       *        - name: miner
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

      getBlocks: params => {
        const { miner } = params
        const query = miner ? { miner } : {}
        return this.getPageData(query, params)
      }
    }
  }
}

export default Block

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
       *          default: blocks
       *        - name: action
       *          in: query
       *          required: true
       *          default: getBlock
       *        - name: hashOrNumber
       *          in: query
       *          schema:
       *            type: string
       *            example: 200
       *      responses:
       *        400:
       *          description: invalid request
       *        200:
       *          description: block data
       *        404:
       *          description: unknown block
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
       *          default: blocks
       *        - name: action
       *          in: query
       *          required: true
       *          default: getBlocks
       *      responses:
       *        400:
       *          description: invalid request
       *        200:
       *          description: list of blocks
      */

      getBlocks: params => {
        return this.getPageData({}, params)
      }
    }
  }
}

export default Block

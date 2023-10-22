import { DataCollectorItem } from '../lib/DataCollector'
import { isBlockHash } from '../../lib/utils'
import { addMetadataToBlocks } from '../lib/blocksMetadata'
import { getBlock } from '../../tools/getBlockEndpointCall'
import { getInitConfig } from '../../lib/Setup'

export class Block extends DataCollectorItem {
  constructor (key) {
    const cursorField = 'number'
    const sortable = { [cursorField]: -1 }
    const sortDir = -1
    super(key, { sortDir, cursorField, sortable })
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

      getBlock: async params => {
        const hashOrNumber = params.hashOrNumber || params.hash || params.number
        let query = {}
        if (isBlockHash(hashOrNumber)) {
          query = { hash: hashOrNumber }
        } else {
          query = { number: parseInt(hashOrNumber) }
        }
        let result = await this.getItem(query, params)
        if (result) {
          let { prev, data, next } = result
          if (prev) {
            result.data = addMetadataToBlocks([prev, data]).pop()
            result.prev = filterBlockFields(prev)
          }
          if (next) result.next = filterBlockFields(next)
        }
        return result
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

      getBlocks: async params => {
        let { miner, addMetadata } = params
        const query = miner ? { miner } : {}
        let result = await this.getPageData(query, params)
        // add blocks metadata
        if (result.data && addMetadata) {
          try {
            let reverse = result.pages.sortDir === -1
            let data = result.data.slice()
            if (reverse) data.reverse()
            let { number } = data[0]
            let { prev } = await this.getPrevNext({ number }, {})
            let topBlock = data[0]
            // insert block at begin to compute first block metadata
            if (prev) result.data.unshift(prev)
            data = addMetadataToBlocks(data)
            // restore first block without metadata
            if (!prev) data.unshift(topBlock)
            if (reverse) data.reverse()
            result.data = data
          } catch (err) {
            return result
          }
        }
        return result
      },
      saveBlock: async params => {
        const number = Number(params.number)
        if (isNaN(number)) throw new Error('Wrong number provided')
        let message

        try {
          const { data } = await this.publicActions.getBlock({ number })
          const exists = data && data.number === number
          if (exists) {
            message = `Block ${number} already in db. Skipped`
          } else {
            const initConfig = await getInitConfig()
            await getBlock(number, { initConfig })
            message = `Block ${number} saved succesfully.`
          }
        } catch (e) {
          console.log(e)
          message = 'errored'
        }

        return { message }
      }
    }
  }
}

function filterBlockFields (block) {
  let { number, _id } = block
  return { number, _id }
}

export default Block

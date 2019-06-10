import { DataCollectorItem } from '../lib/DataCollector'

export class Stats extends DataCollectorItem {
  constructor (collection, key, parent) {
    super(collection, key, parent)
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
       *          default: stats
       *        - name: action
       *          in: query
       *          required: true
       *          default: getStats
       *      responses:
       *        400:
       *          description: invalid request
       *        200:
       *          description: block data
      */
      getStats: params => {
        return this.getPageData({}, params)
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
       *          default: stats
       *        - name: action
       *          in: query
       *          required: true
       *          default: getLatest
       *      responses:
       *        400:
       *          description: invalid request
       *        200:
       *          description: block data
      */
      getLatest: () => {
        return this.getOne()
      }
    }
  }
}

export default Stats

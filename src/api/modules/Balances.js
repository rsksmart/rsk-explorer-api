import { DataCollectorItem } from '../lib/DataCollector'

export class Balances extends DataCollectorItem {
  constructor ({ Balances }, name) {
    let sortable = { timestamp: -1, blockNumber: -1 }
    super(Balances, name, { sortDir: -1, sortable })
    this.fields = {}
    this.publicActions = {
      /**
       * @swagger
       * /api?module=balances&action=getBalances:
       *    get:
       *      description: get address balances
       *      tags:
       *        - balances
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [balances]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getBalances]
       *        - $ref: '#/parameters/address'
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
      */
      getBalances: async params => {
        const { address } = params
        return this.getPageData({ address }, params)
      }
    }
  }
}

export default Balances

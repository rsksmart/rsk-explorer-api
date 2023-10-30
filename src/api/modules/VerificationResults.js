import { DataCollectorItem } from '../lib/DataCollector'

export class VerificationResults extends DataCollectorItem {
  constructor (name) {
    let sortable = { 'address': -1 }
    const cursorField = 'address'
    super(name, { cursorField, sortDir: -1, sortable })
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
      getResults: (params) => {
        params.fields = { address: 1 }
        return this.getPageData({}, params)
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
      getVerification: async (params) => {
        const { address, fields } = params
        const query = { address, match: true }
        return this.getOne(query, fields)
      }
    }
  }
}

export default VerificationResults

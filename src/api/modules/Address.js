import { DataCollectorItem } from '../lib/DataCollector'
import { tokensInterfaces, addrTypes } from '../../lib/types'

export class Address extends DataCollectorItem {
  constructor (name) {
    const cursorField = 'id'
    const sortable = {}
    const sortDir = -1
    super(name, { cursorField, sortDir, sortable })
    this.fields = { code: 0, 'createdByTx.input': 0 }
    this.publicActions = {
      /**
       * @swagger
       * /api?module=addresses&action=getAddress:
       *    get:
       *      description: get address data
       *      tags:
       *        - addresses
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [addresses]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getAddress]
       *        - $ref: '#/parameters/address'
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
        */

      getAddress: async params => {
        const { address } = params
        const aData = await this.getOne({ address }, { id: 0 })
        if (aData && aData.data) {
          let { data } = aData
          if (data.type === addrTypes.CONTRACT) {
            const verified = await this.parent.getModule('ContractVerification')
              .run('isVerified', { address, match: true })
            if (verified) data.verification = verified.data
          }
          aData.data = data
        }
        return aData
      },
      /**
       * @swagger
       * /api?module=addresses&action=getAddresses:
       *    get:
       *      description: get list of addresses
       *      tags:
       *        - addresses
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [addresses]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getAddresses]
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
      getAddresses: params => {
        let type = (params.query) ? params.query.type : null
        let query = (type) ? { type } : {}
        return this.getPageData(query, params, { deleteCodeAndInput: true })
      },
      /**
       * @swagger
       * /api?module=addresses&action=getMiners:
       *    get:
       *      description: get list of miners
       *      tags:
       *        - addresses
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [addresses]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getMiners]
       *        - name: fromBlock
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
      getMiners: params => {
        let query = { }
        let { fromBlock } = params

        if (fromBlock) {
          fromBlock = parseInt(fromBlock)
          query.lastBlockMinedNumber = { gte: fromBlock }
        }

        return this.getPageData(query, params, { isForGetMiners: true })
      },
      /**
       * @swagger
       * /api?module=addresses&action=getTokens:
       *    get:
       *      description: get list of tokens
       *      tags:
       *        - addresses
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [addresses]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getTokens]
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
      getTokens: params => {
        const query = {
          type: addrTypes.CONTRACT,
          contract_contract_addressToaddress: {
            contract_interface: {
              some: {
                interface: {
                  in: tokensInterfaces
                }
              }
            }
          }
        }

        return this.getPageData(query, params, { deleteCodeAndInput: true })
      },
      /**
       * @swagger
       * /api?module=addresses&action=getCirculatingSupply:
       *    get:
       *      description: get list of tokens
       *      tags:
       *        - addresses
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [addresses]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getCirculatingSupply]
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      getCirculatingSupply: params => {
        return this.parent.getCirculatingSupply()
      },
      /**
         * @swagger
         * /api?module=addresses&action=getCode:
         *    get:
         *      description: get contract code
         *      tags:
         *        - addresses
         *      parameters:
         *        - name: module
         *          in: query
         *          required: true
         *          enum: [addresses]
         *        - name: action
         *          in: query
         *          required: true
         *          enum: [getCode]
         *        - $ref: '#/parameters/address'
         *      responses:
         *        200:
         *          $ref: '#/definitions/Response'
         *        400:
         *          $ref: '#/responses/BadRequest'
         *        404:
         *          $ref: '#/responses/NotFound'
         */
      getCode: async params => {
        try {
          const { address } = params
          const result = await this.getOne({ address }, {}, {}, { isForGetCode: true })
          let { data } = result
          if (!data) throw new Error('Unknown address')

          const {
            createdByTx,
            code
          } = data

          if (!code) throw new Error('The address does not have code')

          if (createdByTx) {
            if (createdByTx.internalTxId) {
              // it's an internal transaction
              data.creationCode = createdByTx.action.init
            } else {
              // it's a regular transaction
              data.creationCode = createdByTx.input
            }
            data.created = createdByTx.timestamp
            delete data.createdByTx
          }
          return result
        } catch (err) {
          return Promise.reject(err)
        }
      },
      /**
       * @swagger
       * /api?module=addresses&action=findAddresses:
       *    get:
       *      description: find addresses by name
       *      tags:
       *        - addresses
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [addresses]
       *        - name: action
       *          in: query
       *          required: true
       *        - name: name
       *          required: true
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      findAddresses: async params => {
        const query = {
          name: {
            contains: params.name
          }
        }
        params.field = 'name'
        params.sort = { id: 1 }
        delete params.field.name

        return this.find(query, params, 0, {}, { deleteCodeAndInput: true })
      }
    }
  }
}

export default Address

import { DataCollectorItem } from '../lib/DataCollector'
import { tokensInterfaces, addrTypes, REMASC_NAME, BRIDGE_NAME } from '../../lib/types'
import config from '../../lib/config'
const { bridgeAddress, remascAddress } = config

export class Address extends DataCollectorItem {
  constructor (collection, key, parent) {
    let sortable = { 'createdByTx.timestamp': -1 }
    super(collection, key, parent, { sortDir: 1, sortable })
    const Tx = this.parent.getItem({ key: 'Tx' })
    this.Tx = Tx
    this.fields = { code: 0 }
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
       *          default: addresses
       *        - name: action
       *          in: query
       *          required: true
       *          default: getAddress
       *        - $ref: '#/parameters/address'
       *      responses:
       *        400:
       *          description: invalid request
       *        200:
       *          description: address data
       *        404:
       *          description: invalid address
      */

      getAddress: async params => {
        const { address } = params
        const aData = await this.getOne({ address })
        if (aData.data) {
          if (!aData.data.name) {
            if (address === remascAddress) aData.data.name = REMASC_NAME
            if (address === bridgeAddress) aData.data.name = BRIDGE_NAME
          }
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
       *          default: addresses
       *        - name: action
       *          in: query
       *          required: true
       *          default: getAddresses
       *      responses:
       *        400:
       *          description: invalid request
       *        200:
       *          description: addresses list
      */
      getAddresses: params => {
        let type = (params.query) ? params.query.type : null
        let query = (type) ? { type } : {}
        return this.getPageData(query, params)
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
       *          default: addresses
       *        - name: action
       *          in: query
       *          required: true
       *          default: getTokens
       *      responses:
       *        400:
       *          description: invalid request
       *        200:
       *          description: tokens list
      */
      getTokens: params => {
        return this.getPageData({
          type: addrTypes.CONTRACT,
          contractInterfaces: { $in: tokensInterfaces }
        }, params)
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
       *          default: addresses
       *        - name: action
       *          in: query
       *          required: true
       *          default: getCirculatingSupply
       *      responses:
       *        400:
       *          description: invalid request
       *        200:
       *          description: cisculating supply data
      */
      getCirculatingSupply: params => {
        return this.parent.getCirculatingSupply()
      }
    }
  }
}

export default Address

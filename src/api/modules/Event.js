import { isNativeContract } from '../../lib/NativeContracts'
import { DataCollectorItem } from '../lib/DataCollector'
export class Event extends DataCollectorItem {
  constructor (key) {
    const cursorField = 'eventId'
    const sortable = { blockNumber: -1 }
    const sortDir = -1
    super(key, { cursorField, sortDir, sortable })
    this.publicActions = {
      /**
       * @swagger
       * /api?module=events&action=getEvent:
       *    get:
       *      description: get event data
       *      tags:
       *        - events
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [events]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getEvent]
       *        - name: eventId
       *          in: query
       *          schema:
       *            type: string
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      getEvent: async params => {
        try {
          const { eventId } = params
          if (!eventId) throw new Error('invalid eventId')
          let data = await this.getOne({ eventId })
          if (!data || !data.data) throw new Error(`Event ${eventId} does not exist`)
          const address = data.data.address
          data = await this.parent.addAddressData(address, data)
          return data
        } catch (err) {
          return Promise.reject(err)
        }
      },
      /**
       * @swagger
       * /api?module=events&action=getEventsByAddress:
       *    get:
       *      description: get events by address
       *      tags:
       *        - events
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [events]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getEventsByAddress]
       *        - $ref: '#/parameters/address'
       *        - name: contract
       *          in: query
       *          required: false
       *          schema:
       *            type: string
       *            example: "0x0000000000000000000000000000000001000008"
       *        - name: signatures
       *          in: query
       *          required: false
       *          description: filter by event's signatures
       *          schema:
       *            type: array
       *            example:
       *              e19260aff97b920c7df27010903aeb9c8d2be5d310a2c67824cf3f15396e4c16
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
      getEventsByAddress: async params => {
        const { address, signatures, contract } = params
        if (address) {
          const query = {}
          // search by events signatures, skip remasc & bridge events
          if (Array.isArray(signatures) && !isNativeContract(address)) query.eventSignature = { in: signatures }

          if (contract) query.address = contract
          let res = await this.getPageData(query, params, { isForGetEventsByAddress: true })
          if (res.data) {
            let addresses = new Set(res.data.map(d => d.address))
            addresses = [...addresses.values()]
            let AddressModule = this.parent.getModule('Address')
            if (AddressModule) {
              let addrData = await AddressModule.find({ address: { in: addresses } })
              let { data } = addrData
              if (data) {
                res.data = res.data.map(d => {
                  d._addressData = data.find(a => a.address === d.address)
                  return d
                })
              }
            }
          }
          return res
        }
      },
      /**
       * @swagger
       * /api?module=events&action=getAllEventsByAddress:
       *    get:
       *      description: get events by address
       *      tags:
       *        - events
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [events]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getAllEventsByAddress]
       *        - $ref: '#/parameters/address'
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
      getAllEventsByAddress: async params => {
        const { address } = params
        if (address) {
          return this.getPageData({ address_in_event: { some: { address } } }, params)
        }
      }
    }
  }
}

export default Event

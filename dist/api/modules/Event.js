"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.Event = void 0;var _DataCollector = require("../lib/DataCollector");
class Event extends _DataCollector.DataCollectorItem {
  constructor(collections, key) {
    const sortable = { eventId: -1 };
    const { Events } = collections;
    let cursorField = 'eventId';
    let sortDir = -1;
    super(Events, key, { cursorField, sortDir, sortable });
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
          const { eventId } = params;
          if (!eventId) throw new Error('invalid eventId');
          let data = await this.getOne({ eventId });
          if (!data || !data.data) throw new Error(`Event ${eventId} does not exist`);
          const address = data.data.address;
          data = await this.parent.addAddressData(address, data);
          return data;
        } catch (err) {
          return Promise.reject(err);
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
        const { address, signatures, contract } = params;
        if (address) {
          let query = { _addresses: address };

          // search by events signatures
          if (Array.isArray(signatures)) {
            // skip remasc & bridge events
            const isNative = this.parent.isNativeContract(address);
            if (isNative !== 'bridge' || isNative !== 'remasc') {
              query.signature = { $in: signatures };
            }
          }

          if (contract) query.address = contract;

          let res = await this.getPageData(query, params);
          if (res.data) {
            let addresses = new Set(res.data.map(d => d.address));
            addresses = [...addresses.values()];
            let AddressModule = this.parent.getModule('Address');
            if (AddressModule) {
              let addrData = await AddressModule.find({ address: { $in: addresses } });
              let { data } = addrData;
              if (data) {
                res.data = res.data.map(d => {
                  d._addressData = data.find(a => a.address === d.address);
                  return d;
                });
              }
            }
          }
          return res;
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
        const { address } = params;
        if (address) {
          return this.getPageData({ $or: [{ address }, { _addresses: address }] }, params);
        }
      } };

  }}exports.Event = Event;var _default =


Event;exports.default = _default;
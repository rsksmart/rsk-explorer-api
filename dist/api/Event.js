'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Event = undefined;var _DataCollector = require('../lib/DataCollector');
class Event extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.sort = { address: 1 };
    this.publicActions = {

      getEvent: async params => {
        try {
          const eventId = params.eventId;
          const data = await this.getOne({ eventId });
          if (!data) throw new Error(`Event ${eventId} does not exist`);
          const address = data.data.address;
          return this.parent.addAddressData(address, data);
        } catch (err) {
          return Promise.resolve(err);
        }
      },

      getEventsByAddress: async params => {
        const address = params.address;
        if (address) return this.getPageData({ address }, params);
      } };

  }}exports.Event = Event;exports.default =


Event;
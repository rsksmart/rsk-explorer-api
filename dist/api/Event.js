'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Event = undefined;var _DataCollector = require('../lib/DataCollector');
class Event extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.sort = { address: 1 };
    this.publicActions = {

      getEvent: async params => {
        const _id = params.id;
        const data = await this.getOne({ _id });
        const address = data.DATA.address;
        return this.parent.addAddressData(address, data);
      },

      getEventsByAddress: async params => {
        const address = params.address;
        if (address) return this.getPageData({ address }, params);
      } };

  }}exports.Event = Event;exports.default =


Event;
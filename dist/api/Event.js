'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Event = undefined;var _DataCollector = require('../lib/DataCollector');
class Event extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent);
    this.sort = { address: 1 };
    this.publicActions = {

      getEvent: async params => {
        const _id = params.id;
        const address = params.address;
        const data = await this.getOne({ _id });
        return this.parent.getAddress(address, data);
      },

      getEvents: async params => {
        const address = params.address;
        const data = await this.getPageData({ address }, params);
        return this.parent.getAddress(address, data);
      } };

  }}exports.Event = Event;exports.default =


Event;
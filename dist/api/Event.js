'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Event = undefined;var _DataCollector = require('../lib/DataCollector');
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const { remascAddress, bridgeAddress } = _config2.default;
class Event extends _DataCollector.DataCollectorItem {
  constructor(collection, key, parent) {
    // const sortable = { timestamp: -1 }
    super(collection, key, parent);
    this.publicActions = {

      getEvent: async params => {
        try {
          const { _id } = params;
          let data = await this.getOne({ _id });
          if (!data) throw new Error(`Event ${_id} does not exist`);
          const address = data.data.address;
          data = await this.parent.addAddressData(address, data);
          return data;
        } catch (err) {
          return Promise.resolve(err);
        }
      },

      getEventsByAddress: async params => {
        const { address, signatures, contract } = params;
        if (address) {
          let query = { args: address

            // search by events signatures
          };if (Array.isArray(signatures)) {
            // skip remasc & bridge events
            if (address !== remascAddress && address !== bridgeAddress) {
              query.signature = { $in: signatures };
            }
          }

          if (contract) query.address = contract;

          let res = await this.getPageData(query, params);
          if (res.data) {
            let addresses = new Set(res.data.map(d => d.address));
            addresses = [...addresses.values()];
            let addrData = await this.parent.Address.find({ address: { $in: addresses } });
            let { data } = addrData;
            if (data) {
              res.data = res.data.map(d => {
                d._addressData = data.find(a => a.address === d.address);
                return d;
              });
            }
          }
          return res;
        }
      },

      getAllEventsByAddress: async params => {
        const { address } = params;
        if (address) {
          return this.getPageData({ $or: [{ address }, { args: address }] }, params);
        }
      } };

  }}exports.Event = Event;exports.default =


Event;
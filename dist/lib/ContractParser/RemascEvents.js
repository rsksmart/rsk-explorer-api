"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.RemascEvents = void 0;var rlp = _interopRequireWildcard(require("rlp"));function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) {var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {};if (desc.get || desc.set) {Object.defineProperty(newObj, key, desc);} else {newObj[key] = obj[key];}}}}newObj.default = obj;return newObj;}}

class RemascEvents {
  decode(log) {
    let event = this.decodeEventName(log.topics[0]);
    // at the moment remasc emits only one event
    if (event === 'mining_fee_topic') {
      let [blockHash, value] = this.decodeData(log.data);
      let to = this.decodeAddress(log.topics[1]);
      log.event = event;
      log.args = [to, blockHash, value];
      log.abi = this.fakeAbi();
    }
    return log;
  }

  decodeEventName(name) {
    name = name.slice(0, 2) === '0x' ? name.slice(2, name.length) : name;
    return Buffer.from(name, 'hex').toString('ascii').replace(/\0/g, '');
  }

  decodeData(data) {
    return rlp.decode(data).map(d => '0x' + d.toString('hex').replace(/^0+/, ''));
  }

  decodeAddress(address) {
    return '0x' + address.slice(-40);
  }
  fakeAbi() {
    return {
      anonymous: false,
      inputs: [
      {
        indexed: true,
        name: 'to',
        type: 'address' },

      {
        indexed: false,
        name: 'blockHash',
        type: 'address' },

      {
        indexed: false,
        name: 'value',
        type: 'uint256' }],


      name: 'mining_fee_topic',
      type: 'event' };

  }}exports.RemascEvents = RemascEvents;


const remascEvents = new RemascEvents();var _default =
remascEvents;exports.default = _default;
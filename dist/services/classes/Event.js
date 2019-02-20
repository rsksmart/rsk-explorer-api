'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.formatEvent = undefined;var _txFormat = require('../../lib/txFormat');

const formatEvent = exports.formatEvent = (event, tx) => {
  let { timestamp, receipt } = tx;
  let id = (0, _txFormat.eventId)(event, tx);
  event._id = id;
  event.eventId = id;
  event.timestamp = timestamp;
  event.txStatus = receipt.status;
  event.event = event.event || null;
  return event;
};
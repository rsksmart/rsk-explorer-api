"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatEvent = void 0;var _ids = require("../../lib/ids");

const formatEvent = (event, tx) => {
  let { timestamp, receipt } = tx;
  let id = (0, _ids.eventId)(event, tx);
  event.eventId = id;
  event.timestamp = timestamp;
  event.txStatus = receipt.status;
  event.event = event.event || null;
  return event;
};exports.formatEvent = formatEvent;
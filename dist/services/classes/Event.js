"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.formatEvent = void 0;var _ids = require("../../lib/ids");

const formatEvent = (event, tx) => {
  if (!event) return;
  const { timestamp, receipt } = tx;
  const id = (0, _ids.getEventId)(event);
  event.eventId = id;
  event.timestamp = timestamp;
  event.txStatus = receipt.status;
  event.event = event.event || null;
  event._addresses = event._addresses || [];
  return event;
};exports.formatEvent = formatEvent;
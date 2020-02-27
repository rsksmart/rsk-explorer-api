"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Channel = Channel;exports.default = void 0;var _apiTools = require("./apiTools");

function Channel(channelName, io) {
  const events = {
    join: undefined,
    leave: undefined };


  const sendToChannel = (event, action, payload) => {
    if (!event) throw new Error(`invalid event ${event}`);
    if (!action) throw new Error(`invalid action ${action}`);
    if (typeof payload !== 'object') throw new Error(`invalid payload ${payload}`);
    if (Object.keys(payload) < 1) throw new Error(`payload is empty`);
    payload.action = action;
    payload.channel = channelName;
    payload = (0, _apiTools.formatRes)(payload);
    io.to(channelName).emit(event, payload);
  };
  const emit = (action, result) => {
    return sendToChannel('data', action, { result });
  };

  const channelEvent = (event, socket) => {
    socket[event](channelName);
    const onEvent = events[event];
    if (typeof onEvent === 'function') {
      return onEvent(socket);
    }
  };

  const confirmSubscription = socket => {
    socket.emit('subscription', { channel: channelName });
  };
  const join = socket => {
    channelEvent('join', socket);
    confirmSubscription(socket);
  };

  const leave = socket => {
    return channelEvent('leave', socket);
  };

  const on = (event, cb) => {
    if (!events.hasOwnProperty(event)) {
      throw new Error(`Unknown event ${event}`);
    }
    if (typeof cb !== 'function') {
      throw new Error(`Second argument must be a function`);
    }
    events[event] = cb;
  };
  return Object.freeze({ name: channelName, join, leave, on, emit });
}var _default =

Channel;exports.default = _default;
'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.UserEventsApi = undefined;var _path = require('path');var _path2 = _interopRequireDefault(_path);
var _child_process = require('child_process');
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _apiTools = require('./lib/apiTools');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

function UserEventsSocket() {
  return (0, _child_process.fork)(_path2.default.resolve(__dirname, '../services/userEvents/userEventsService.js'));
}

const UserEventsApi = exports.UserEventsApi = (io, api, { log }) => {
  if (!_config2.default.api.allowUserEvents) return;
  log = log || console;
  const userEvents = UserEventsSocket();

  userEvents.on('message', async msg => {
    try {
      const { payload, module } = msg;
      const action = payload.action;
      const res = await processMsg(msg, api);
      let result = res.data;
      let req = payload;
      let error = res.error;
      const socket = io.sockets.connected[msg.socketId];
      if (socket) socket.emit('data', (0, _apiTools.formatRes)({ module, action, result, req, error }));
    } catch (err) {
      log.error(err);
      return Promise.reject(err);
    }
  });
  return Object.freeze(userEvents);
};

async function processMsg(msg, api) {
  let data, error;
  if (!msg.error) {
    if (msg.data) {
      data = msg;
    } else {
      const { result } = await api.run(msg.payload);
      data = result;
    }
  } else {
    error = _apiTools.errors[msg.error.code] || _apiTools.errors.INVALID_REQUEST;
    data = msg.result;
  }
  return { data, error };
}exports.default =

UserEventsApi;
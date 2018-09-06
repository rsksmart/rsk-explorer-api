'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.UserEventsApi = undefined;var _path = require('path');var _path2 = _interopRequireDefault(_path);
var _child_process = require('child_process');
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _apiLib = require('./apiLib');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

function UserEventsSocket() {
  return (0, _child_process.fork)(_path2.default.resolve(__dirname, '../services/userEvents.js'));
}

const UserEventsApi = exports.UserEventsApi = (io, blocks, log) => {
  if (!_config2.default.api.allowUserEvents) return;
  log = log || console;
  const userEvents = UserEventsSocket();

  userEvents.on('message', msg => {
    const socket = io.sockets.connected[msg.socketId];
    if (socket) {
      const payload = msg.payload;
      const action = payload.action;
      processMsg(action, msg, blocks).
      then(res => {
        socket.emit('data', (0, _apiLib.formatRes)(action, res.data, payload, res.error));
      }).catch(err => {
        log.error(err);
      });
    } else {
      log.error(`Socket id: ${msg.socketId} not found`);
    }
  });
  return userEvents;
};

async function processMsg(action, msg, blocks) {
  let data, error;
  if (!msg.error) {
    if (msg.data) {
      data = msg;
    } else {
      data = await blocks.run(action, msg.params).then(result => {
        return result;
      });
    }
  } else {
    error = _apiLib.errors[msg.error.code] || _apiLib.errors.INVALID_REQUEST;
    data = msg.result;
  }
  return { data, error };
}exports.default =

UserEventsApi;
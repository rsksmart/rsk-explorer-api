'use strict';var _socket = require('socket.io-client');var _socket2 = _interopRequireDefault(_socket);
var _cli = require('../lib/cli');var c = _interopRequireWildcard(_cli);function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const url = process.argv[2];
let channel = process.argv[3];

if (!url || !channel) help();

const socket = _socket2.default.connect(url, { reconnect: true });

c.info(`Waiting for WS on ${url}`);

socket.on('connect', data => {
  c.ok('Connected! ✌');
  c.info(`subscribing to channel: ${channel}`);
  socket.emit('subscribe', { to: channel });
});

socket.on('subscription', data => {
  if (channel === data.channel) {
    c.info(`subscribed to channel: ${channel}`);
  }
});

socket.on('disconnect', socket => {
  c.warn('Disconnected ☹');
});

socket.on('data', async res => {
  try {
    console.log(res);
  } catch (err) {
    c.error(err);
    process.exit(9);
  }
});

socket.on('Error', err => {
  let error = err.error || '';
  c.error(`ERROR: ${error}`);
  c.warn(err);
});

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(9);
});

function help() {
  c.info(`Usage: ${process.argv[0]} ${process.argv[1]} [url] [channel]`);
  process.exit(0);
}
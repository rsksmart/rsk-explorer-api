"use strict";var _socket = _interopRequireDefault(require("socket.io-client"));
var _rskJsCli = require("@rsksmart/rsk-js-cli");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const url = process.argv[2];
let channel = process.argv[3];

if (!url || !channel) help();

const socket = _socket.default.connect(url, { reconnect: true });

_rskJsCli.log.info(`Waiting for WS on ${url}`);

socket.on('connect', data => {
  _rskJsCli.log.ok('Connected! ✌');
  _rskJsCli.log.info(`subscribing to channel: ${channel}`);
  socket.emit('subscribe', { to: channel });
});

socket.on('subscription', data => {
  if (channel === data.channel) {
    _rskJsCli.log.info(`subscribed to channel: ${channel}`);
  }
});

socket.on('disconnect', socket => {
  _rskJsCli.log.warn('Disconnected ☹');
});

socket.on('data', async res => {
  try {
    console.log(res);
  } catch (err) {
    _rskJsCli.log.error(err);
    process.exit(9);
  }
});

socket.on('Error', err => {
  let error = err.error || '';
  _rskJsCli.log.error(`ERROR: ${error}`);
  _rskJsCli.log.warn(err);
});

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(9);
});

function help() {
  _rskJsCli.log.info(`Usage: ${process.argv[0]} ${process.argv[1]} [url] [channel]`);
  process.exit(0);
}
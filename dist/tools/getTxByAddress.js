"use strict";var _socket = _interopRequireDefault(require("socket.io-client"));
var _config = _interopRequireDefault(require("../lib/config"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const url = process.env.URL || `ws://localhost:${_config.default.api.port}`;
const address = process.argv[2] || null;
const type = 'blocks';
const action = 'getTransactionsByAddress';

const reset = '\x1b[0m';
const red = '\x1b[31m';
const blue = '\x1b[36m';
const green = '\x1b[32m';
const orange = '\x1b[33m';

const error = l => console.log(red, l, reset);
const warn = l => console.log(orange, l, reset);
const info = l => console.log(blue, l, reset);
const ok = l => console.log(green, l, reset);

const socket = _socket.default.connect(url, { reconnect: true });
if (!address) {
  error('Missing address');
  process.exit(9);
}
info(`Waiting for: ${url}`);

socket.on('connect', s => {
  ok('Connected! ✌');
  info(`Getting tx by address: ${address}`);
  socket.emit('data', { type, action, params: { address } });
});

socket.on('disconnect', socket => {
  warn('Disconnected ☹');
});

socket.on('data', data => {
  if (data.action === type + action) {
    console.dir(data);
  }
});

socket.on('error', err => {
  error(err);
});
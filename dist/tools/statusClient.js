'use strict';

var _socket = require('socket.io-client');

var _socket2 = _interopRequireDefault(_socket);

var _config = require('../lib/config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const server = process.env.SERVER || 'localhost';
const port = process.env.PORT || _config2.default.server.port;
const url = `ws://${server}:${port}`;

const reset = '\x1b[0m';
const red = '\x1b[31m';
const blue = '\x1b[36m';
const green = '\x1b[32m';
const orange = '\x1b[33m';

const error = l => console.log(red, l, reset);
const warn = l => console.log(orange, l, reset);
const info = l => console.log(blue, l, reset);
const ok = l => console.log(green, l, reset);

const socket = _socket2.default.connect(url, { reconnect: true });
info(`Waiting for: ${url}`);

socket.on('connect', socket => {
  ok('Connected! ✌');
});

socket.on('disconnect', socket => {
  warn('Disconnected ☹');
});

socket.on('data', data => {
  let action = data.action;
  if (action === 'dbStatus' && data.data) {
    const status = data.data;
    console.clear();
    console.log();
    info(url);
    console.log();
    console.log(`   Api  ${socket.connected ? green : red} ● ${reset}`);
    console.log(`   Node ${!status.nodeDown ? green : red} ● ${reset}`);
    console.log(`   Db   ${status.dbMissingBlocks > 0 ? red : status.requestingBlocks > 5 ? orange : green} ● ${reset}`);
    console.log();
    console.dir(status, { colors: true });
    if (status.nodeDown) error('The node is down... ☹ ');
  }
});

socket.on('error', error => {
  error(error);
});
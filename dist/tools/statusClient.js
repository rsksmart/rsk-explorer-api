'use strict';var _socket = require('socket.io-client');var _socket2 = _interopRequireDefault(_socket);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _cli = require('../lib/cli');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const url = process.env.URL || `ws://localhost:${_config2.default.server.port}`;


const socket = _socket2.default.connect(url, { reconnect: true });
(0, _cli.info)(`Waiting for: ${url}`);

socket.on('connect', socket => {
  (0, _cli.ok)('Connected! ✌');
});

socket.on('disconnect', socket => {
  (0, _cli.warn)('Disconnected ☹');
});

socket.on('data', data => {
  let action = data.action;
  if (action === 'dbStatus' && data.data) {
    const status = data.data;
    delete status.missingSegments;
    console.clear();
    console.log();
    (0, _cli.info)(url);
    console.log();
    console.log(`   Api  ${socket.connected ? _cli.green : _cli.red} ● ${_cli.reset}`);
    console.log(`   Node ${!status.nodeDown ? _cli.green : _cli.red} ● ${_cli.reset}`);
    console.log(`   Db   ${status.dbMissingBlocks > 0 ? _cli.red : status.requestingBlocks > 5 ? _cli.orange : _cli.green} ● ${_cli.reset}`);
    console.log();
    console.dir(status, { colors: true });
    if (status.nodeDown) (0, _cli.error)('The node is down... ☹ ');
  }
});

socket.on('error', err => {
  (0, _cli.error)(err);
});
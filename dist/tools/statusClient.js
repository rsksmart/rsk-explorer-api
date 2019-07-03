'use strict';var _socket = require('socket.io-client');var _socket2 = _interopRequireDefault(_socket);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _cli = require('../lib/cli');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const url = process.env.URL || `ws://localhost:${_config2.default.api.port}`;
const socket = _socket2.default.connect(url, { reconnect: true });
let blocksPerSecond;
let stats = { time: 0, blocks: 0 };
let mark = '●';

(0, _cli.info)(`Waiting for: ${url}`);

socket.emit('subscribe', { to: 'status' });

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
    const prevState = status.prevState;
    if (prevState && prevState.dbTime) {
      stats.time += parseInt((status.dbTime - prevState.dbTime) / 1000);
      stats.blocks += status.dbBlocks - prevState.dbBlocks;
      blocksPerSecond = (stats.blocks / stats.time).toFixed(1);
    }
    delete status.missingSegments;
    delete status.prevState;
    let { dbMissingBlocks, nodeDown, requestingBlocks, dbHighBlock, dbBlocks } = status;
    console.clear();
    console.log();
    (0, _cli.info)(url);
    console.log();
    console.log(`   Api  ${socket.connected ? _cli.green : _cli.red} ${mark} ${_cli.reset}`);
    console.log(`   Node ${!nodeDown ? _cli.green : _cli.red} ${mark} ${_cli.reset}`);
    console.log(`   Db   ${dbMissingBlocks > 0 ? _cli.red : requestingBlocks > 5 ? _cli.orange : _cli.green} ${mark} ${_cli.reset}`);
    console.log();
    console.dir(status, { colors: true });
    if (blocksPerSecond) {
      let color = blocksPerSecond < 10 ? _cli.red : blocksPerSecond < 20 ? _cli.orange : _cli.green;
      let endTime = Math.floor(dbMissingBlocks / blocksPerSecond);
      let end = new Date(Date.now() + endTime * 1000);
      console.log();
      console.log(`${color} ≈ ${blocksPerSecond} B/s${_cli.reset}`);
      console.log(`${color} ≈ ${parseInt(blocksPerSecond * 3600)} B/h${_cli.reset}`);
      console.log(`${_cli.blue} ≈ Remaining Time:${_cli.reset} ${Math.round(endTime / 3600)} H${_cli.reset}`);
      console.log(`${_cli.blue} ≈ End:${_cli.reset} ${end.toUTCString()}${_cli.reset}`);
    }
    if (nodeDown) (0, _cli.error)('The node is down... ☹ ');
    // show progress bar
    if (dbMissingBlocks > 1) {
      let bar = (0, _cli.progressBar)(dbHighBlock, dbBlocks, { steps: 30 });
      console.log();
      console.log(`  ${_cli.blue}${bar}${_cli.reset}`);
    }
  }
});

socket.on('error', err => {
  (0, _cli.error)(err);
});
"use strict";var _socket = _interopRequireDefault(require("socket.io-client"));
var _config = _interopRequireDefault(require("../lib/config"));
var _rskJsCli = require("@rsksmart/rsk-js-cli");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const url = process.env.URL || `ws://localhost:${_config.default.api.port}`;
const socket = _socket.default.connect(url, { reconnect: true });
let blocksPerSecond;
let stats = { time: 0, blocks: 0 };
let mark = '●';

_rskJsCli.log.info(`Waiting for: ${url}`);

socket.emit('subscribe', { to: 'status' });

socket.on('connect', socket => {
  _rskJsCli.log.ok('Connected! ✌');
});

socket.on('disconnect', socket => {
  _rskJsCli.log.warn('Disconnected ☹');
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
    _rskJsCli.log.info(url);
    console.log();
    console.log(`   Api  ${socket.connected ? _rskJsCli.green : _rskJsCli.red} ${mark} ${_rskJsCli.reset}`);
    console.log(`   Node ${!nodeDown ? _rskJsCli.green : _rskJsCli.red} ${mark} ${_rskJsCli.reset}`);
    console.log(`   Db   ${dbMissingBlocks > 0 ? _rskJsCli.red : requestingBlocks > 5 ? _rskJsCli.orange : _rskJsCli.green} ${mark} ${_rskJsCli.reset}`);
    console.log();
    console.dir(status, { colors: true });
    if (blocksPerSecond) {
      let color = blocksPerSecond < 10 ? _rskJsCli.red : blocksPerSecond < 20 ? _rskJsCli.orange : _rskJsCli.green;
      let endTime = Math.floor(dbMissingBlocks / blocksPerSecond);
      let end = new Date(Date.now() + endTime * 1000);
      console.log();
      console.log(`${color} ≈ ${blocksPerSecond} B/s${_rskJsCli.reset}`);
      console.log(`${color} ≈ ${parseInt(blocksPerSecond * 3600)} B/h${_rskJsCli.reset}`);
      console.log(`${_rskJsCli.blue} ≈ Remaining Time:${_rskJsCli.reset} ${Math.round(endTime / 3600)} H${_rskJsCli.reset}`);
      console.log(`${_rskJsCli.blue} ≈ End:${_rskJsCli.reset} ${end.toUTCString()}${_rskJsCli.reset}`);
    }
    if (nodeDown) _rskJsCli.log.error('The node is down... ☹ ');
    // show progress bar
    if (dbMissingBlocks > 1) {
      let bar = (0, _rskJsCli.progressBar)(dbHighBlock, dbBlocks, { steps: 30 });
      console.log();
      console.log(`  ${_rskJsCli.blue}${bar}${_rskJsCli.reset}`);
    }
  }
});

socket.on('error', err => {
  _rskJsCli.log.error(err);
});
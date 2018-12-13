'use strict';var _socket = require('socket.io-client');var _socket2 = _interopRequireDefault(_socket);
var _cli = require('../lib/cli');var c = _interopRequireWildcard(_cli);
var _fs = require('fs');var _fs2 = _interopRequireDefault(_fs);
var _util = require('util');var _util2 = _interopRequireDefault(_util);function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;} else {var newObj = {};if (obj != null) {for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];}}newObj.default = obj;return newObj;}}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const writeFile = _util2.default.promisify(_fs2.default.writeFile);
const url = process.env.url || 'http://localhost:3003';
const outDir = process.env.outDir || '/tmp';

let payload = process.env.payload;

if (!url || !payload) help();
payload = JSON.parse(payload);
if (!payload.module || !payload.action || !payload.params) help();

const outFile = `${outDir}/${payload.module}-${payload.action}.json`;

const socket = _socket2.default.connect(url, { reconnect: true });
let results = [];
const key = `${payload.module}${payload.action}${Date.now()}${Math.round(Math.random())}`;
payload.key = key;

c.info(`Waiting for WS on ${url}`);

socket.on('connect', data => {
  c.ok('Connected! ✌');
  c.info(`sending payload`);
  getPage(socket, payload);
});

socket.on('disconnect', socket => {
  c.warn('Disconnected ☹');
});

socket.on('data', async res => {
  let { data, action, error, req } = res;

  if (error) c.error(error);
  if (!error && req && key === req.key) {

    // multiple results
    if (res.pages) {
      let { page, pages, total } = res.pages;
      if (page === 1) c.info(`Total ${total}`);

      c.info(`Adding ${data.length}`);

      if (Array.isArray(data)) results = results.concat(data);else
      results.push(data);

      if (page < pages) {
        page++;
        getPage(socket, payload, page, pages);
      } else {
        c.ok(`Done: ${results.length} results`);
        if (results.length) await saveToFile(results, outFile);
        process.exit(0);
      }
    } else {// single result
      c.ok('Saving to file');
      await saveToFile(data, outFile);
      process.exit(0);
    }
  }
});

socket.on('Error', err => {
  c.error(err);
});

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(9);
});

function getPage(socket, payload, page = 1, pages = 0) {
  let pMsg = pages ? `${page}/${pages}` : page;
  c.ok(`Getting page: ${pMsg}`);
  payload = Object.assign({}, payload);
  payload.params = payload.params || {};
  payload.params.page = page;
  socket.emit('data', payload);
}

function help() {
  if (!url) c.info('Set enviroment variable url=[explorer-api-url]');
  if (!payload) c.info(`Set enviroment variable payload, e.g. payload='{"module":"blocks","action":"getBlock","params":{"hashOrNumber":200}}'`);
  c.info(`Usage: payload=[payload] url=[url] [outDir=(path)] | ${process.argv[0]} ${process.argv[1]} { payload }`);
  process.exit(0);
}

async function saveToFile(data, file) {
  try {
    await writeFile(file, JSON.stringify(data));
    c.ok(`File saved: ${file}`);
  } catch (err) {
    console.error(`Error writing file ${file}: ${err}`);
    process.exit(7);
  }
}
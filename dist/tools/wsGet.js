"use strict";var _socket = _interopRequireDefault(require("socket.io-client"));
var c = _interopRequireWildcard(require("../lib/cli"));
var _fs = _interopRequireDefault(require("fs"));
var _util = _interopRequireDefault(require("util"));function _getRequireWildcardCache() {if (typeof WeakMap !== "function") return null;var cache = new WeakMap();_getRequireWildcardCache = function () {return cache;};return cache;}function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;}var cache = _getRequireWildcardCache();if (cache && cache.has(obj)) {return cache.get(obj);}var newObj = {};if (obj != null) {var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) {var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;if (desc && (desc.get || desc.set)) {Object.defineProperty(newObj, key, desc);} else {newObj[key] = obj[key];}}}}newObj.default = obj;if (cache) {cache.set(obj, newObj);}return newObj;}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const writeFile = _util.default.promisify(_fs.default.writeFile);
const url = process.env.url || 'http://localhost:3003';
const outDir = process.env.outDir || '/tmp';

let payload = process.env.payload || process.argv[2];

if (!url || !payload) help();
payload = JSON.parse(payload);
if (!payload.module || !payload.action || !payload.params) help();

const outFile = `${outDir}/${payload.module}-${payload.action}.json`;

const socket = _socket.default.connect(url, { reconnect: true });
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
  try {
    let { data, error, req } = res;
    if (error) {
      c.error(error);
      process.exit();
    }
    if (!error && req && key === req.key) {
      // multiple results
      if (res.pages) {
        let { prev, next, total, limit } = res.pages;
        if (!prev) c.info(`Total ${total}`);

        c.info(`Adding ${data.length}`);

        if (Array.isArray(data)) results = results.concat(data);else
        results.push(data);

        if (!payload.limit) payload.limit = limit;

        if (next) {
          getPage(socket, payload, next);
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

function getPage(socket, payload, next) {
  let { limit } = payload;
  let count = false;
  limit = limit || '';
  if (!next) {
    count = true;
    c.ok(`Getting first ${limit} items`);
  } else {
    c.ok(`Getting next ${limit} items: ${next}`);
  }
  payload = Object.assign({}, payload);
  payload.params = payload.params || {};
  payload.params.next = next;
  payload.params.count = count;
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
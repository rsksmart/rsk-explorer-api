"use strict";var _socket = _interopRequireDefault(require("socket.io-client"));
var _rskJsCli = require("@rsksmart/rsk-js-cli");
var _fs = _interopRequireDefault(require("fs"));
var _crypto = _interopRequireDefault(require("crypto"));
var URL = _interopRequireWildcard(require("url"));
var _package = _interopRequireDefault(require("../../package.json"));function _getRequireWildcardCache() {if (typeof WeakMap !== "function") return null;var cache = new WeakMap();_getRequireWildcardCache = function () {return cache;};return cache;}function _interopRequireWildcard(obj) {if (obj && obj.__esModule) {return obj;}if (obj === null || typeof obj !== "object" && typeof obj !== "function") {return { default: obj };}var cache = _getRequireWildcardCache();if (cache && cache.has(obj)) {return cache.get(obj);}var newObj = {};var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;for (var key in obj) {if (Object.prototype.hasOwnProperty.call(obj, key)) {var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;if (desc && (desc.get || desc.set)) {Object.defineProperty(newObj, key, desc);} else {newObj[key] = obj[key];}}}newObj.default = obj;if (cache) {cache.set(obj, newObj);}return newObj;}function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const url = process.env.url || 'ws://localhost:3003';
if (process.argv[2] === '--help') help();
const outDir = process.env.outDir || '/tmp';

let payload = process.env.payload || process.argv[2];

if (!isValidURL(url) || !payload) help();
payload = JSON.parse(payload);
if (!payload.module || !payload.action || !payload.params) help();

const destinationFile = getDestinationFile(payload);
const file = createFileStream(destinationFile);

const socket = _socket.default.connect(url, { reconnect: true });
let results = 0;
const key = createRequestKey(payload);
payload.key = key;

_rskJsCli.log.info(`Waiting for WS on ${url}`);

socket.on('connect', data => {
  _rskJsCli.log.ok('Connected! ✌');
  _rskJsCli.log.info(`sending payload`);
  getPage(socket, payload);
});

socket.on('disconnect', socket => {
  _rskJsCli.log.warn('Disconnected ☹');
});

socket.on('data', async res => {
  try {
    let { data, error, req } = res;
    if (error) {
      _rskJsCli.log.error(error);
      process.exit();
    }
    if (!error && req && key === req.key) {
      // multiple results
      if (res.pages) {
        let { prev, next, total, limit } = res.pages;
        if (!prev) _rskJsCli.log.info(`Total ${total}`);

        _rskJsCli.log.info(`Adding ${data.length}`);

        // send data to file stream
        await addDataToFile(data);

        if (!payload.limit) payload.limit = limit;

        if (next) {
          getPage(socket, payload, next);
        } else {
          await closeFileAndExit();
        }
      } else {// single result
        _rskJsCli.log.ok('Saving to file');
        await addDataToFile(data);
        await closeFileAndExit();
      }
    }
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

function getDestinationFile(payload, count = 0) {
  count = count || 0;
  let { module, action } = payload;
  let suffix = count ? `-${count}` : '';
  let fileName = `${module}-${action}${suffix}.json`;
  let dest = `${outDir}/${fileName}`;
  if (_fs.default.existsSync(dest)) return getDestinationFile(payload, count + 1);
  return dest;
}

async function addDataToFile(data) {
  try {
    let items = await file.put(data);
    results += items;
  } catch (err) {
    return Promise.reject(err);
  }
}

async function closeFileAndExit() {
  try {
    await file.close();
    _rskJsCli.log.ok(`Done: ${results} results`);
    _rskJsCli.log.info(`File saved: ${destinationFile}`);
    process.exit(0);
  } catch (err) {
    _rskJsCli.log.error(err);
    process.exit(9);
  }
}

function getPage(socket, payload, next) {
  let params = payload.params || {};
  let { limit } = params;
  let count = false;
  limit = limit || '';
  if (!next) {
    count = true;
    if (params.next) next = params.next;
    _rskJsCli.log.ok(`Getting first ${limit} items`);
  } else {
    _rskJsCli.log.ok(`Getting next ${limit} items: ${next}`);
  }
  payload = Object.assign({}, payload);
  payload.params = payload.params || {};
  payload.params.next = next;
  payload.params.count = count;
  socket.emit('data', payload);
}

function help() {
  let { name } = _package.default;
  if (!isValidURL(url)) _rskJsCli.log.warn(`Invalid URL: ${url}`);
  // if (!payload) log.warn(`Set environment variable payload, e.g. payload='{"module":"blocks","action":"getBlock","params":{"hashOrNumber":200}}'`)
  _rskJsCli.log.ok('');
  _rskJsCli.log.ok(`Usage:`);
  _rskJsCli.log.info('');
  _rskJsCli.log.info('All parameters must be provided as environment variables');

  _rskJsCli.log.info('');
  _rskJsCli.log.info('Required parameters:');
  _rskJsCli.log.info('');
  _rskJsCli.log.example(`     url: ${name} instance URL`);
  _rskJsCli.log.example(`     payload: ${name} payload`);
  _rskJsCli.log.info('');
  _rskJsCli.log.info('Optionals parameters:');
  _rskJsCli.log.info('');
  _rskJsCli.log.example(`     outDir: destination folder`);
  _rskJsCli.log.info('');
  _rskJsCli.log.ok('Examples:');
  _rskJsCli.log.example('');
  _rskJsCli.log.info('Get block');
  _rskJsCli.log.example(`    export url=wss://backend.explorer.rsk.co`);
  _rskJsCli.log.example(`    export payload='{"module":"blocks","action":"getBlock","params":{"hashOrNumber":200}}'`);
  _rskJsCli.log.example('');
  _rskJsCli.log.info('Get blocks');
  _rskJsCli.log.example(`    export url=wss://backend.explorer.rsk.co`);
  _rskJsCli.log.example(`    export payload='{"module":"blocks","action":"getBlocks","params":{"next":200,"sort":{"number":-1}}}'`);
  _rskJsCli.log.example('');
  process.exit(0);
}

function createFileStream(destinationFile) {
  const file = _fs.default.createWriteStream(destinationFile);
  const addLineToFile = data => {
    return new Promise((resolve, reject) => {
      let line = JSON.stringify(data) + '\n';
      const errorListener = () => reject(new Error('Error adding line to file'));
      // use addListener instead of 'on' to remove event later, and prevent memory leaks
      file.addListener('error', errorListener);
      file.write(line, () => resolve());
      file.removeListener('error', errorListener);
    });
  };

  const put = async data => {
    try {
      if (!Array.isArray(data)) data = [data];
      for (let d of data) {
        await addLineToFile(d);
      }
      return data.length;
    } catch (err) {
      return Promise.reject(err);
    }
  };
  const close = () => {
    return new Promise((resolve, reject) => {
      file.end(() => resolve());
      file.on('error', err => {
        reject(err);
      });
    });
  };
  return Object.freeze({ put, close });
}

function createRequestKey({ action, module }) {
  let rnd = _crypto.default.randomBytes(8).toString('hex');
  return `${module} - ${action} - ${rnd}`;
}

function isValidURL(url) {
  try {
    let { protocol } = URL.parse(url);
    return /^ws/.test(protocol);
  } catch (err) {
    _rskJsCli.log.error(err);
    return false;
  }
}
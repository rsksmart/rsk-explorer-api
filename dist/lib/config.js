'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _path = require('path');var _path2 = _interopRequireDefault(_path);
var _fs = require('fs');var _fs2 = _interopRequireDefault(_fs);

var _defaultConfig = require('./defaultConfig');var _defaultConfig2 = _interopRequireDefault(_defaultConfig);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const keys = Object.keys(_defaultConfig2.default);
const config = loadConfig();
for (let key of keys) {
  config[key] = config[key] || _defaultConfig2.default[key];
  for (let p in _defaultConfig2.default[key]) {
    if (undefined === config[key][p]) config[key][p] = _defaultConfig2.default[key][p];
  }
}

// defaults  servers/ports

config.blocks.node = config.blocks.node || config.source.node;
config.blocks.port = config.blocks.port || config.source.port;

let s = config.source;
config.source.url = config.source.url || `${s.protocol}://${s.node}:${s.port}`;

// defaults log files

defaultLogs('api');
defaultLogs('blocks');

// tx addresses
publicSettings('bridgeAddress');
publicSettings('remascAddress');

function publicSettings(key) {
  config[key] = config.publicSettings[key] || null;
}

function defaultLogs(key) {
  const dir = config.log.dir;
  if (!dir) return;
  config[key].log = config[key].log || {};
  config[key].log.file = config[key].log.file || `${dir}/${key}.json`;
  config[key].log.level = config[key].log.level || config.log.level || 'error';
}

function loadConfig() {
  let config = {};
  try {
    let file = _path2.default.resolve(__dirname, '../../config.json');
    if (_fs2.default.existsSync(file)) config = JSON.parse(_fs2.default.readFileSync(file, 'utf-8'));

  } catch (err) {
    console.log(err);
    process.exit(8);
  }
  return config;
}exports.default =

config;
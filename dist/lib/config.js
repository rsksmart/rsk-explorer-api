"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createConfig = createConfig;exports.makeConfig = makeConfig;exports.nodeSources = nodeSources;exports.createNodeSource = createNodeSource;exports.default = exports.config = void 0;var _path = _interopRequireDefault(require("path"));
var _fs = _interopRequireDefault(require("fs"));
var _url = _interopRequireDefault(require("url"));
var _defaultConfig = _interopRequireDefault(require("./defaultConfig"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const config = createConfig('../../config.json');exports.config = config;

function createConfig(file) {
  return makeConfig(loadConfig(file));
}

function makeConfig(config = {}) {
  const defaultLogs = key => {
    const dir = config.log.dir;
    if (!dir) return;
    config[key].log = config[key].log || {};
    config[key].log.file = config[key].log.file || `${dir}/${key}.json`;
    config[key].log.level = config[key].log.level || config.log.level || 'info';
  };

  const keys = Object.keys(_defaultConfig.default);

  for (let key of keys) {
    config[key] = config[key] || _defaultConfig.default[key];
    for (let p in _defaultConfig.default[key]) {
      if (undefined === config[key][p]) config[key][p] = _defaultConfig.default[key][p];
    }
  }

  // enable undefined modules
  for (let module in _defaultConfig.default.api.modules) {
    config.api.modules[module] = config.api.modules[module] !== false;
  }

  // defaults  servers/ports
  config.source = nodeSources(config.source);
  config.blocks.source = config.source;

  // defaults log files

  defaultLogs('api');
  defaultLogs('blocks');

  config.api.collectionsNames = config.collectionsNames;
  return config;
}

function loadConfig(file) {
  let config = {};
  if (file) {
    try {
      file = _path.default.resolve(__dirname, file);
      if (_fs.default.existsSync(file)) config = JSON.parse(_fs.default.readFileSync(file, 'utf-8'));
    } catch (err) {
      console.log(err);
      process.exit(8);
    }
  }
  return config;
}

function nodeSources(sources) {
  if (!Array.isArray(sources)) sources = [sources];
  sources = sources.map(s => createNodeSource(s));
  sources = Object.values(sources.reduce((v, a, i) => {
    let { url } = a;
    v[url] = a;
    return v;
  }, {}));

  return sources.length > 1 ? sources : sources[0];
}

function createNodeSource(s) {
  let url = s.url || `${s.protocol}://${s.node}:${s.port}`;
  let { protocol, port, hostname: node } = _url.default.parse(url);
  protocol = protocol.replace(/:$/, '');
  return { protocol, node, port, url };
}var _default =

config;exports.default = _default;
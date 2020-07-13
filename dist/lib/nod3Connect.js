"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.nod3Router = exports.nod3 = exports.nod3Log = exports.nod3Instance = exports.createNod3Router = exports.nod3BySource = exports.nod3Connect = void 0;var _nod = require("nod3");
var _config = _interopRequireDefault(require("./config"));
var _utils = require("../lib/utils");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const { HttpProvider } = _nod.Nod3.providers;
const { source, sourceRoutes } = _config.default;

const nod3Connect = (url, options = {}) => new _nod.Nod3(new HttpProvider(url), options);

// return Nod3 | Nod3Router based on source
exports.nod3Connect = nod3Connect;const nod3BySource = (source, options = {}, nod3) => {
  if (Array.isArray(source)) return createNod3Router(source, options);
  return nod3 || nod3Instance(source, options);
};exports.nod3BySource = nod3BySource;

const createNod3Router = (sources, options = {}) => {
  const providers = sources.map(({ url }) => new HttpProvider(url));
  let { nod3, router } = (0, _nod.Nod3Router)(providers, options);
  // Add routes
  if (sourceRoutes && typeof sourceRoutes === 'object') {
    for (let module in sourceRoutes) {
      let to = sourceRoutes[module];
      router.add({ module, to });
    }
  }
  return nod3;
};

// Returns always a nod3 instance
exports.createNod3Router = createNod3Router;const nod3Instance = (source, options = {}) => {
  const sources = !Array.isArray(source) ? [source] : [...source];
  return nod3Connect(sources[0].url, options);
};exports.nod3Instance = nod3Instance;

const nod3Log = log => ({ method, params, time, url }) => {
  let m = time > 200 ? 'warn' : 'debug';
  let marks = (0, _utils.quantityMarks)(time, 100, '*');
  params = params ? JSON.stringify(params) : '';
  return log[m](`${marks}[NOD3] [${url}] ${method} (${params}) -- time:${time}ms`);
};exports.nod3Log = nod3Log;

const nod3 = nod3Instance(source);exports.nod3 = nod3;
const nod3Router = nod3BySource(source, {}, nod3);exports.nod3Router = nod3Router;var _default =

nod3;exports.default = _default;
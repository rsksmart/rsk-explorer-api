"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.apps = exports.paths = void 0;
var _config = _interopRequireDefault(require("../lib/config"));
var _servicesConfig = require("./servicesConfig");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const { services } = _config.default.blocks;

const scripts = Object.entries(_servicesConfig.servicesNames).
filter(([service]) => services[service]).
map(([service, name]) => name);

const scriptName = name => `${name}.js`;

const cwd = `${__dirname}/blocks/`;
const { log } = _config.default;

const paths = scripts.map(name => cwd + scriptName(name));exports.paths = paths;

const apps = scripts.map(name => {
  let script = scriptName(name);
  let conf = { name, script, cwd };
  if (log && log.dir) {
    let { dir } = log;
    conf.error_file = `${dir}/${name}-error.log`;
    conf.out_file = `${dir}/${name}-out.log`;
  }
  return conf;
});exports.apps = apps;
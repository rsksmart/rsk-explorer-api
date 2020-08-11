"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.apps = void 0;var _config = _interopRequireDefault(require("../lib/config"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const cwd = `${__dirname}`;
const name = 'explorer-api';
const script = 'index.js';
const { log } = _config.default;

const conf = { script, name, cwd };

if (log && log.dir) {
  let { dir } = log;
  conf.error_file = `${dir}/${name}-error.log`;
  conf.out_file = `${dir}/${name}-out.log`;
}

const apps = [conf];exports.apps = apps;

console.log(apps);
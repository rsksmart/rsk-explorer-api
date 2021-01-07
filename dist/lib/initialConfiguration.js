"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _path = _interopRequireDefault(require("path"));
var _fs = _interopRequireDefault(require("fs"));
var _utils = require("./utils");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

/**
 *
 */

const defaultConfig = {
  nativeContracts: {
    bridge: '0x0000000000000000000000000000000001000006',
    remasc: '0x0000000000000000000000000000000001000008' } };



const config = checkConfig(Object.assign(loadConfig(), defaultConfig));

function loadConfig() {
  let config = {};
  try {
    let file = _path.default.resolve(__dirname, '../../initial-config.json');
    if (_fs.default.existsSync(file)) config = JSON.parse(_fs.default.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.log(err);
    process.exit(8);
  }
  return config;
}

function checkConfig(config) {
  const { nativeContracts } = config;
  for (let contract in nativeContracts) {
    let address = nativeContracts[contract];
    if (!(0, _utils.isAddress)(address)) {
      throw new Error(`Invalid address ${address}, contract:${contract}`);
    }
  }
  return config;
}var _default =

config;exports.default = _default;
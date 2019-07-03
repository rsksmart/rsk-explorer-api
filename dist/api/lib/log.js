'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _Logger = require('../../lib/Logger');
var _config = require('../../lib/config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const log = (0, _Logger.Logger)('explorer-api', _config2.default.api.log);exports.default =
log;
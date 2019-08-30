"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _Logger = require("../../lib/Logger");
var _config = _interopRequireDefault(require("../../lib/config"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const log = (0, _Logger.Logger)('explorer-api', _config.default.api.log);var _default =
log;exports.default = _default;
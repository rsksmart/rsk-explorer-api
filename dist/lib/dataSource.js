"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.dataSource = exports.setup = void 0;
var _Setup = _interopRequireDefault(require("./Setup"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const setup = ({ log, skipCheck } = {}) => (0, _Setup.default)(({ log } = {})).then(setup => setup.start(skipCheck));exports.setup = setup;
const dataSource = setup;exports.dataSource = dataSource;var _default =
setup;exports.default = _default;
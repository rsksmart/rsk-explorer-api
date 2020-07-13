"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.dataSource = exports.setup = void 0;
var _Setup = _interopRequireDefault(require("./Setup"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const setup = async ({ log, skipCheck } = {}) => {
  try {
    const setup = await (0, _Setup.default)({ log });
    return setup.start(skipCheck);
  } catch (err) {
    return Promise.reject(err);
  }
};exports.setup = setup;
const dataSource = setup;exports.dataSource = dataSource;var _default =
setup;exports.default = _default;
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.LogProxy = exports.Logger = void 0;var _bunyan = _interopRequireDefault(require("bunyan"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const Logger = (name, options) => {
  options = options || {};
  let level = options.level || 'trace';
  const log = _bunyan.default.createLogger({
    name,
    level });


  if (options.file) {
    log.addStream({
      path: options.file,
      level: options.level || 'info' });

  }

  log.on('error', (err, stream) => {
    console.error('Log error ', err);
  });
  return log;
};exports.Logger = Logger;

const logProxyHandler = logger => {
  return {
    get: (target, prop) => {
      if (logger && typeof logger === 'object') return logger[prop];else
      return () => {};
    } };

};

const LogProxy = logger => {
  return new Proxy({}, logProxyHandler(logger));
};exports.LogProxy = LogProxy;var _default =

Logger;exports.default = _default;
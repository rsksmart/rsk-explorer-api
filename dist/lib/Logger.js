'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Logger = undefined;var _bunyan = require('bunyan');var _bunyan2 = _interopRequireDefault(_bunyan);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const Logger = exports.Logger = (name, options) => {
  options = options || {};
  const log = _bunyan2.default.createLogger({
    name,
    level: 'trace' });


  if (options.file) {
    log.addStream({
      path: options.file,
      level: options.level || 'info' });

  }

  log.on('error', (err, stream) => {
    console.error('Log error ', err);
  });
  return log;
};exports.default =

Logger;
'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.HttpServer = undefined;var _http = require('http');var _http2 = _interopRequireDefault(_http);
var _express = require('express');var _express2 = _interopRequireDefault(_express);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const HttpServer = exports.HttpServer = ({ blocks, status }) => {
  const app = (0, _express2.default)();
  const httpServer = _http2.default.Server(app);
  app.set('etag', false);
  app.set('x-powered-by', false);

  app.use('/status', (req, res) => {
    const data = status.getState().data;
    res.send(data);
  });

  app.use('/circulating', (req, res) => {
    const data = blocks.getCirculatingSupply().data;
    res.send(data);
  });

  // 404
  app.use((req, res, next) => res.status(404).send());
  return httpServer;
};exports.default =

HttpServer;
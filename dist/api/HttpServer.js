'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.HttpServer = undefined;var _http = require('http');var _http2 = _interopRequireDefault(_http);
var _express = require('express');var _express2 = _interopRequireDefault(_express);
var _api = require('./routes/api');var _api2 = _interopRequireDefault(_api);
var _doc = require('./routes/doc');var _doc2 = _interopRequireDefault(_doc);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const HttpServer = exports.HttpServer = ({ api, status, log }) => {
  const app = (0, _express2.default)();
  const httpServer = _http2.default.Server(app);
  app.set('etag', false);
  app.set('x-powered-by', false);

  app.get('/status', (req, res) => {
    const data = status.getState().data;
    res.send(data);
  });

  app.get('/circulating', (req, res) => {
    const data = api.getCirculatingSupply().data;
    res.send(data);
  });

  app.use('/api', (0, _api2.default)({ log, api }));

  if (_config2.default.api.exposeDoc) {
    app.use('/doc', (0, _doc2.default)({ log, app }));
  }

  // 404
  app.use((req, res, next) => res.status(404).send());
  return httpServer;
};exports.default =

HttpServer;
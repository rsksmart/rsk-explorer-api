"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.HttpServer = void 0;var _http = _interopRequireDefault(require("http"));
var _express = _interopRequireDefault(require("express"));
var _api = _interopRequireDefault(require("./routes/api"));
var _doc = _interopRequireDefault(require("./routes/doc"));
var _config = _interopRequireDefault(require("../lib/config"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const HttpServer = ({ api, status, log }) => {
  const app = (0, _express.default)();
  const httpServer = _http.default.Server(app);
  app.set('etag', false);
  app.set('x-powered-by', false);

  // status
  app.get('/status', (req, res) => {
    const data = status.getState().data;
    res.send(data);
  });

  // circulating supply
  app.get('/circulating/:field?', (req, res) => {
    let { field } = req.params;
    let { data } = api.getCirculatingSupply();
    data = field ? `${data[field]}` : data;
    res.send(data);
  });

  app.use('/api', (0, _api.default)({ log, api }));

  if (_config.default.api.exposeDoc) {
    app.use('/doc', (0, _doc.default)({ log, app }));
  }

  // 404
  app.use((req, res, next) => res.status(404).send());
  return httpServer;
};exports.HttpServer = HttpServer;var _default =

HttpServer;exports.default = _default;
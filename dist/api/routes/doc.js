'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _express = require('express');var _express2 = _interopRequireDefault(_express);
var _rskOpenapiUi = require('rsk-openapi-ui');var _rskOpenapiUi2 = _interopRequireDefault(_rskOpenapiUi);
var _path = require('path');var _path2 = _interopRequireDefault(_path);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const router = _express2.default.Router();

const Routes = ({ log, app } = {}) => {
  app.use('/doc', _express2.default.static(_rskOpenapiUi2.default.getDistPath()));

  router.get('/swagger.json', (req, res) => {
    res.sendFile(_path2.default.resolve(__dirname, '../../../public/swagger.json'));
  });

  return router;
};exports.default =

Routes;
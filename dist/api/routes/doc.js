"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _express = _interopRequireDefault(require("express"));
var _rskOpenapiUi = _interopRequireDefault(require("rsk-openapi-ui"));
var _path = _interopRequireDefault(require("path"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const router = _express.default.Router();

const Routes = ({ log, app } = {}) => {
  app.use('/doc', _express.default.static(_rskOpenapiUi.default.getDistPath()));

  router.get('/swagger.json', (req, res) => {
    res.sendFile(_path.default.resolve(__dirname, '../../../public/swagger.json'));
  });

  return router;
};var _default =

Routes;exports.default = _default;
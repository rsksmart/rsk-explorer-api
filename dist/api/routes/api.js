"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _express = _interopRequireDefault(require("express"));
var _bodyParser = _interopRequireDefault(require("body-parser"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const router = _express.default.Router();

const Routes = ({ log, api }) => {
  const getResult = async (api, { module, action, params }) => {
    try {
      const { result } = await api.run({ module, action, params });
      if (!result) throw new Error('Missing result');
      if (!result.data) throw new Error('Missing data');
      return result;
    } catch (err) {
      return Promise.reject(err);
    }
  };
  const sendResult = async (api, res, { module, action, params }) => {
    let result;
    try {
      if (!!module !== !!action) {
        res.status(400).send();
        return;
      }
      if (!module && !action) result = api.info();else
      result = await getResult(api, { module, action, params });
      if (!result) throw new Error('Empty result');
      res.send(result);
    } catch (err) {
      res.status(404).send();
      log.error(err);
    }
  };

  router.get('/', (req, res, next) => {
    const params = req.query;
    const { module, action } = params;
    delete params.module;
    delete params.action;
    return sendResult(api, res, { module, action, params });
  });

  router.post('/', _bodyParser.default.json(), (req, res, next) => {
    return sendResult(api, res, req.body);
  });

  return router;
};var _default =

Routes;exports.default = _default;
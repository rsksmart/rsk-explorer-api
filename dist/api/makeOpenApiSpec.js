"use strict";var _swaggerJsdoc = _interopRequireDefault(require("swagger-jsdoc"));
var _package = _interopRequireDefault(require("../../package.json"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const { name, version } = _package.default;

const options = {
  swaggerDefinition: {
    info: {
      title: name,
      version,
      description: 'explorer API Documentation' } },


  apis: ['src/api/modules/*.js', 'src/api/docs.yaml'] };


const specs = (0, _swaggerJsdoc.default)(options);
console.log(JSON.stringify(specs, null, 2));
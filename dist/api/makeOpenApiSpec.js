'use strict';var _swaggerJsdoc = require('swagger-jsdoc');var _swaggerJsdoc2 = _interopRequireDefault(_swaggerJsdoc);
var _package = require('../../package.json');var _package2 = _interopRequireDefault(_package);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const { name, version } = _package2.default;

const options = {
  swaggerDefinition: {
    info: {
      title: name,
      version,
      description: 'explorer API Documentation' } },


  apis: ['src/api/modules/*.js', 'src/api/docs.yaml'] };


const specs = (0, _swaggerJsdoc2.default)(options);
console.log(JSON.stringify(specs, null, 2));
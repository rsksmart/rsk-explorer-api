'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _classDb = require('./classDb');

var _classDb2 = _interopRequireDefault(_classDb);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const db = new _classDb2.default(_config2.default.db.server, _config2.default.db.port, _config2.default.db.database);

exports.default = db.db();
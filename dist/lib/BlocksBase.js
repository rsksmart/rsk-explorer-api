'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.BlocksBase = undefined;var _blocksCollections = require('./blocksCollections');
var _types = require('./types');
var _nod3Connect = require('./nod3Connect');var _nod3Connect2 = _interopRequireDefault(_nod3Connect);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class BlocksBase {
  constructor(db, options) {
    options = options || {};
    this.db = db;
    this.collections = (0, _blocksCollections.getDbBlocksCollections)(db);
    this.nod3 = _nod3Connect2.default;
    this.log = options.Logger || console;
    this.et = _types.events;
    this.actions = _types.actions;
  }}exports.BlocksBase = BlocksBase;exports.default =


BlocksBase;
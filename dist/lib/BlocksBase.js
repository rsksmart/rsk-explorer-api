'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.BlocksBase = undefined;var _web3Connect = require('./web3Connect');var _web3Connect2 = _interopRequireDefault(_web3Connect);
var _blocksCollections = require('./blocksCollections');
var _types = require('./types');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class BlocksBase {
  constructor(db, options) {
    options = options || {};
    this.db = db;
    this.collections = (0, _blocksCollections.getDbBlocksCollections)(db);
    this.web3 = _web3Connect2.default;
    this.log = options.Logger || console;
    this.et = _types.events;
    this.actions = _types.actions;
  }}exports.BlocksBase = BlocksBase;
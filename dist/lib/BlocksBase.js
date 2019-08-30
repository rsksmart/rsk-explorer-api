"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.BlocksBase = void 0;var _blocksCollections = require("./blocksCollections");
var _types = require("./types");
var _nod3Connect = _interopRequireDefault(require("./nod3Connect"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class BlocksBase {
  constructor(db, { log, nativeContracts }) {
    this.db = db;
    this.collections = db ? (0, _blocksCollections.getDbBlocksCollections)(db) : undefined;
    this.nod3 = _nod3Connect.default;
    this.log = log || console;
    this.et = _types.events;
    this.actions = _types.actions;
    this.nativeContracts = nativeContracts;
  }}exports.BlocksBase = BlocksBase;var _default =


BlocksBase;exports.default = _default;
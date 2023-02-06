"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.BlockTrace = void 0;var _BcThing = require("./BcThing");
var _utils = require("../../lib/utils");
var _blockTrace = require("../../repositories/blockTrace.repository");

class BlockTrace extends _BcThing.BcThing {
  constructor(hash, { nod3, collections, log, initConfig }) {
    if (!(0, _utils.isBlockHash)(hash)) throw new Error(`Invalid blockHash ${hash}`);
    super({ nod3, collections, log, initConfig });
    this.hash = hash;
    this.collection = collections.BlocksTraces;
  }
  async fetch() {
    try {
      let { hash } = this;
      let data = await this.getFromDb();
      if (!data) {
        data = await this.nod3.trace.block(hash);
        await this.save(data);
      }
      return data;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async getFromDb() {
    try {
      let { hash, collection } = this;
      let res = await _blockTrace.blockTraceRepository.findOne({ hash }, {}, collection);
      return res ? res.data : null;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  save(data) {
    if (!data) return this.fetch();
    let { hash } = this;
    return _blockTrace.blockTraceRepository.insertOne({ hash, data }, this.collection);
  }}exports.BlockTrace = BlockTrace;var _default =


BlockTrace;exports.default = _default;
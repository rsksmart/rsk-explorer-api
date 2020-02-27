"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.getBlock = getBlock;exports.default = exports.RequestBlocks = void 0;
var _events = require("events");
var _BlocksBase = require("../../lib/BlocksBase");
var _types = require("../../lib/types");
var _Block = require("./Block");
var _utils = require("../../lib/utils");

class Emitter extends _events.EventEmitter {}

class RequestBlocks extends _BlocksBase.BlocksBase {
  constructor(db, options) {
    let { log, initConfig } = options;
    super(db, { log, initConfig });
    this.queueSize = options.blocksQueueSize || 50;
    this.pending = new Set();
    this.requested = new Map();
    this.events = options.noEvents ? null : new Emitter();
    this.maxRequestTime = 1000;
  }

  emit(event, data) {
    let events = this.events;
    if (events) {
      events.emit(event, data);
    }
  }

  request(key, prioritize) {
    let add = this.addToPending(key, prioritize);
    if (add) this.processPending();
  }

  bulkRequest(keys) {
    for (let key of keys) {
      this.addToPending(key);
    }
    this.processPending();
  }

  addToPending(key, prioritize) {
    if (this.isRequested(key)) {
      this.log.trace(`The key ${key} is already requested`);
      return;
    }
    if (prioritize) {
      let pending = [...this.pending];
      pending.unshift(key);
      this.pending = new Set(pending);
    } else {
      this.pending.add(key);
    }
    return true;
  }

  processPending() {
    let i = this.pending.values();
    let free = this.queueSize - this.requested.size;
    let total = this.requested.size + this.pending.size;
    if (total === 0) this.emit(_types.events.QUEUE_DONE);
    while (free > -1) {
      let key = i.next().value;
      if (!key) return;
      this.pending.delete(key);
      this.requestBlock(key);
      free--;
    }
  }

  async requestBlock(key) {
    try {
      this.requested.set(key, Date.now());
      this.emit(_types.events.BLOCK_REQUESTED, { key });
      let block = await this.getBlock(key);
      if (block.error) this.emit(_types.events.BLOCK_ERROR, block);
      this.endRequest(key, block);
    } catch (err) {
      this.log.error(err);
      this.endRequest(key);
    }
  }

  async getBlock(hashOrNumber) {
    try {
      let hash = (0, _utils.isBlockHash)(hashOrNumber) ? hashOrNumber : null;
      if (!hash) {
        this.log.debug(`Searching for best block for: ${hashOrNumber}`);
        let blocks = await this.nod3.rsk.getBlocksByNumber(hashOrNumber);
        hash = blocks.find(b => b.inMainChain === true);
        hash = hash.hash || null;
        this.log.debug(`${hashOrNumber}: ${hash}`);
      }
      hash = hash || hashOrNumber;
      const { nod3, collections, log, initConfig } = this;
      let block = await getBlock(hash, { nod3, collections, log, initConfig });
      return block;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  endRequest(key, res) {
    let time = Date.now() - this.requested.get(key);
    this.requested.delete(key);
    this.pending.delete(key);
    this.log.trace(`Key ${key} time: ${time}`);
    if (res && res.block) {
      let block = res.block;
      this.emit(_types.events.NEW_BLOCK, { key, block });
      return res.block;
    }
    this.processPending();
  }

  isRequestedOrPending(key) {
    return this.isRequested(key) || this.isPending(key);
  }

  isPending(key) {
    return this.pending.has(key);
  }

  isRequested(key) {
    let isRequested = this.requested.has(key);
    return isRequested ? Date.now() - this.requested.get(key) < this.maxRequestTime : false;
  }

  getRequested() {
    return this.requested.size;
  }

  getPending() {
    return this.pending.size;
  }}exports.RequestBlocks = RequestBlocks;


async function getBlock(hashOrNumber, { nod3, collections, log, initConfig }) {
  if ((0, _utils.isBlockHash)(hashOrNumber)) {
    let block = await (0, _Block.getBlockFromDb)(hashOrNumber, collections.Blocks);
    if (block) return { block, key: hashOrNumber };
  }
  try {
    let newBlock = new _Block.Block(hashOrNumber, { nod3, collections, log, initConfig });
    let block = await newBlock.save().then(res => {
      if (!res || !res.data) return;
      return res.data.block;
    });
    return { block, key: hashOrNumber };
  } catch (error) {
    return { error, key: hashOrNumber };
  }
}var _default =

RequestBlocks;exports.default = _default;
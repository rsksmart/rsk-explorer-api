"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.Status = void 0;var _DataCollector = require("./lib/DataCollector/");
var _blocksCollections = require("../lib/blocksCollections");
var _block = require("../repositories/block.repository");

class Status extends _DataCollector.DataCollector {
  constructor(db) {
    const collections = (0, _blocksCollections.getDbBlocksCollections)(db);
    const { Status, Blocks } = collections;
    super(db, { collectionName: 'Status' });
    this.tickDelay = 5000;
    this.state = {};
    this.addModule(new _DataCollector.DataCollectorItem(Status, 'Status'));
    this.addModule(new _DataCollector.DataCollectorItem(Blocks, 'Blocks'));
    this.blockCollection = this.getModule('Blocks').db;
  }
  tick() {
    this.updateState().then(newState => {
      if (newState) {
        this.events.emit('newStatus', this.formatData(newState));
      }
    });
  }
  getState() {
    return this.formatData(this.state);
  }
  getBlocksServiceStatus() {
    const Status = this.getModule('Status');
    return Status.find({}, { timestamp: -1 }, 1).
    then(res => {
      res = res.data[0];
      if (res) delete res._id;
      return res;
    });
  }
  async updateState() {
    try {
      let status = await this.getStatus();
      status = status || {};
      let state = this.state;
      let changed = Object.keys(status).find(k => status[k] !== state[k]);
      if (changed) {
        let prevState = Object.assign({}, this.state);
        delete prevState.prevState;
        status.prevState = prevState;
        this.state = status;
        return status;
      }
    } catch (err) {
      this.log.warn(err);
    }
  }

  async getStatus() {
    try {
      const [blocksStatus, last, high, dbBlocks] =
      await Promise.all([
      this.getBlocksServiceStatus(),
      this.getLastblockReceived(),
      this.getHighestBlock(),
      this.getTotalBlocks()]);

      const status = Object.assign(blocksStatus || {}, {
        dbLastBlockReceived: last.number,
        dbLastBlockReceivedTime: last._received,
        dbHighBlock: high.number,
        dbBlocks,
        dbMissingBlocks: high.number + 1 - dbBlocks,
        dbTime: Date.now() });

      return status;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  getHighestBlock() {
    return _block.blockRepository.findOne({}, { sort: { number: -1 }, limit: 1 }, this.blockCollection);
  }
  getLastblockReceived() {
    return _block.blockRepository.findOne({}, { sort: { _received: -1 }, limit: 1 }, this.blockCollection);
  }
  getTotalBlocks() {
    return _block.blockRepository.countDocuments({}, this.blockCollection);
  }}exports.Status = Status;var _default =


Status;exports.default = _default;
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.TxPool = void 0;var _DataCollector = require("./lib/DataCollector");
var _config = _interopRequireDefault(require("../lib/config"));
var _txPool = require("../repositories/txPool.repository");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const collectionName = _config.default.collectionsNames.TxPool;

class TxPool extends _DataCollector.DataCollector {
  constructor(db) {
    super(db, { collectionName });
    this.tickDelay = 1000;
    this.state = {};
    this.chart = [];
  }
  start() {
    super.start();
    this.updatePool();
  }

  tick() {
    this.updatePool();
  }

  async updatePool() {
    try {
      let pool = await this.getPool();
      if (pool && pool.timestamp !== this.state.timestamp) {
        this.state = Object.assign({}, pool);
        this.events.emit('newPool', this.getState());
        await this.updatePoolChart();
        this.events.emit('poolChart', this.getPoolChart());
      }
    } catch (err) {
      this.log.error(err);
    }
  }

  getPool() {
    return _txPool.txPoolRepository.findOne({}, { sort: { _id: -1 } }, this.collection);
  }

  async updatePoolChart() {
    try {
      let chart = await _txPool.txPoolRepository.find({}, { txs: 0 }, this.collection, { timestamp: -1 }, 200);
      this.chart = chart;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  getPoolChart() {
    let chart = this.chart.concat().reverse();
    return this.formatData(chart);
  }

  getState() {
    let state = Object.assign({}, this.state);
    delete state._id;
    return this.formatData(state);
  }}exports.TxPool = TxPool;var _default =


TxPool;exports.default = _default;
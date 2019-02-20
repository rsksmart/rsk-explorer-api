'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.TxPool = undefined;var _DataCollector = require('../lib/DataCollector');
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const collectionName = _config2.default.blocks.collections.TxPool;

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
    return this.collection.findOne({}, { sort: { _id: -1 } });
  }

  async updatePoolChart() {
    try {
      let chart = await this.collection.find({}).
      sort({ timestamp: -1 }).
      project({ txs: 0 }).
      limit(200).
      toArray();
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
  }}exports.TxPool = TxPool;exports.default =


TxPool;
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _dataCollector = require('./dataCollector');

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const perPage = _config2.default.api.perPage;
const statsCollection = _config2.default.blocks.statsCollection;

class Stats extends _dataCollector.DataCollector {
  constructor(db) {
    super(db, { perPage, statsCollection });
    this.state = {};
    this.addItem(statsCollection, 'stats', null, true);
  }
  tick() {
    let state = this.state;
    this.updateState().then(newState => {
      if (state.timestamp !== newState.timestamp) {
        this.events.emit('newStats', newState);
      }
    });
  }
  getStatsFromDb() {
    return this.stats.getOne({}).then(res => {
      return res;
    });
  }
  getState() {
    return this.formatData(this.state);
  }
  updateState() {
    return this.getStatsFromDb().then(stat => {
      stat = stat.DATA;
      this.state = stat;
      return stat;
    });
  }
  dbStatus(blocks, lastBlock) {
    let missingBlocks = blocks - lastBlock.number;
  }
}

exports.default = Stats;
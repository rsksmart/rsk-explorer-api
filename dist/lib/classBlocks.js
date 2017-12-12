'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _events = require('events');

var _timers = require('timers');

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const perPage = _config2.default.api.perPage;


class Emitter extends _events.EventEmitter {}
const emitter = new Emitter();

class Blocks {
  constructor(db) {
    this.collection = db.collection(_config2.default.blocks.blockCollection);
    this.events = emitter;
    this.lastLimit = _config2.default.api.lastBlocks;
    this.filterParams = _utils.filterParams;
    this.latest = 0;
    this.last = [];
    this.getLastBlocks = () => {
      this.collection.find().sort({ number: -1 }).limit(this.lastLimit).toArray((err, docs) => {
        if (err) console.log(err);else this.updateLastBlocks(docs);
      });
    };

    this.updateLastBlocks = blocks => {
      this.last = blocks;
      let latest = blocks[0].number;
      if (latest !== this.latest) {
        this.latest = latest;
        this.events.emit('newBlocks', blocks);
      }
      //this.events.emit('newBlocks', blocks)
    };
    (0, _timers.setInterval)(() => {
      this.getLastBlocks();
    }, 1000);
  }
}

exports.default = Blocks;
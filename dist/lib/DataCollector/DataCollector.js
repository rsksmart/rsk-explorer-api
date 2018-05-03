'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DataCollector = undefined;

var _events = require('events');

var _timers = require('timers');

var _utils = require('../utils');

var _DataCollectorItem = require('./DataCollectorItem');

var _DataCollectorItem2 = _interopRequireDefault(_DataCollectorItem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Emitter extends _events.EventEmitter {}
const emitter = new Emitter();
class DataCollector {
  constructor(db, options) {
    this.db = db;
    this.options = options;
    this.collection = null;
    this._keyName = options.keyName || '_id';
    this.events = emitter;
    this._interval = null;
    this.items = {};
    this.perPage = options.perPage || 50;
    this.setCollection(options.collectionName);
    this.tickDelay = 1000;
  }
  tick() {}
  stop() {
    if (this._interval) {
      this._interval = (0, _timers.clearInterval)(this._interval);
    }
  }
  start() {
    if (!this._interval) {
      this._interval = setInterval(() => {
        this.tick();
      }, this.tickDelay);
    }
  }
  setCollection(collectionName, name = 'collection') {
    if (collectionName && !this[name]) this[name] = this.db.collection(collectionName);
  }
  getItem(params) {
    let key = params.key || params[this._keyName];
    if (key) return this.items[key];
  }
  run() {}
  itemPublicAction(action, params, item) {
    return new Promise((resolve, reject) => {
      if (!action) reject('Missing action');
      if (!params) reject('No params provided');
      if (item === '*') {
        //find item
        item = null;
        item = this.searchItemByAction(action);
      } else {
        item = item || this.getItem(params);
      }
      if (action && item) {
        let method = item.publicActions[action];
        if (method) {
          resolve(method(this.filterParams(params)));
        } else {
          reject('Unknown method ' + action);
        }
      }
      reject('Unknown action or bad params requested, action:' + action);
    });
  }
  searchItemByAction(action) {
    for (let i in this.items) {
      let item = this.items[i];
      if (item.publicActions[action]) return item;
    }
  }
  addItem(collectionName, key, itemClass, addToRoot) {
    if (collectionName && key) {
      itemClass = itemClass || _DataCollectorItem2.default;
      if (!this.items[key]) {
        let collection = this.db.collection(collectionName);
        if (collection) {
          let item = new itemClass(collection, key, this);
          this.items[key] = item;
          if (addToRoot) {
            if (!this[key]) this[key] = item;else console.log(`Error key: ${key} exists`);
          }
        }
      } else {
        console.log('Error the key: ' + key + ' already exists');
      }
    }
  }

  filterParams(params) {
    return (0, _utils.filterParams)(params, this.perPage);
  }

  formatData(data) {
    return { DATA: data };
  }
}

exports.DataCollector = DataCollector;
exports.default = DataCollector;
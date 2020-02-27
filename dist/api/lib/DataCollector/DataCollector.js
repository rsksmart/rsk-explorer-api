"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.DataCollector = void 0;var _events = require("events");
var _timers = require("timers");
var _utils = require("../../../lib/utils");
var _apiTools = require("../apiTools");
var _mongodb = require("mongodb");
var _log = _interopRequireDefault(require("../log"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

class Emitter extends _events.EventEmitter {}
const emitter = new Emitter();

class DataCollector {
  constructor(db, options) {
    if (!(db instanceof _mongodb.Db)) {throw new Error('Db is not mongodb Db');}
    this.db = db;
    this.options = options;
    this.collection = null;
    this._keyName = options.keyName || '_id';
    this.events = emitter;
    this._interval = null;
    this.modules = {};
    this.setCollection(options.collectionName);
    this.tickDelay = 1000;
    this.serialize = _utils.serialize;
    this.log = options.log || _log.default;
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
    if (collectionName && !this[name]) {
      this[name] = this.db.collection(collectionName);
    }
  }

  run() {}

  addModule(module, name) {
    try {
      name = name || module.getName();
      if (!name) throw new Error(`Invalid module name ${name}`);
      if (this.modules[name]) throw new Error(`The module: ${name} already exists`);
      module.serialize = this.serialize;
      module.parent = this;
      this.modules[name] = module;
    } catch (err) {
      this.log.warn(err);
      throw err;
    }
  }

  getModule(name) {
    const module = this.modules[name];
    // if (!module) throw new Error(`Unknown module ${name}`)
    return module;
  }

  filterParams(params) {
    return (0, _apiTools.filterParams)(params);
  }

  formatData(data) {
    return { data };
  }}exports.DataCollector = DataCollector;var _default =


DataCollector;exports.default = _default;
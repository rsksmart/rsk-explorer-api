"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.Db = void 0;var _mongodb = require("mongodb");
var _Logger = require("./Logger");

const connectionOptions = { useNewUrlParser: true, useUnifiedTopology: true };
class Db {
  constructor(config) {
    config = config || {};
    const { server, port, password, user, db, database } = config;
    this.server = server || 'localhost';
    this.port = port || 27017;
    this.dbName = database || db;
    if (!this.dbName) throw new Error('Missing database name');
    let url = 'mongodb://';
    if (user && password) url += `${user}:${password}@`;
    url += `${this.server}:${this.port}/${this.dbName}`;
    this.url = url;
    this.client = null;
    this.log = undefined;
    this.DB = undefined;
    this.setLogger(config.Logger || console);
    this.connect();
  }
  async connect() {
    try {
      if (!this.client) {
        this.client = await _mongodb.MongoClient.connect(this.url, connectionOptions);
      }
      return this.client;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async db() {
    try {
      if (this.DB) return this.DB;
      let client = await this.connect();
      this.DB = client.db(this.dbName);
      return this.DB;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  setLogger(log) {
    this.log = log && log.constructor && log.constructor.name === 'Logger' ? log : (0, _Logger.LogProxy)(log);
  }

  getLogger() {
    return this.log;
  }

  async createCollection(collectionName, { indexes, options } = {}, { dropIndexes, validate } = {}) {
    try {
      const db = await this.db();
      if (!collectionName) throw new Error('Invalid collection name');
      let collection = await db.createCollection(collectionName, options);
      if (dropIndexes) {
        this.log.info(`Removing indexes from ${collectionName}`);
        await collection.dropIndexes();
      }
      if (indexes && indexes.length) {
        this.log.info(`Creating indexes to ${collectionName}`);
        await collection.createIndexes(indexes);
      }
      if (validate) {
        this.log.info(`Validating collection: ${collectionName}`);
        await db.admin().validateCollection(collectionName);
      }
      return collection;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  createCollections(collections, creationOptions = {}) {
    let queue = [];
    let names = creationOptions.names || {};
    for (let c in collections) {
      let name = names[c] || c;
      queue.push(this.createCollection(name, collections[c], creationOptions).
      then(collection => {
        this.log.info(`Created collection ${name}`);
        return collection;
      }).
      catch(err => {
        this.log.error(`Error creating collection ${name} ${err}`);
        return Promise.reject(err);
      }));

    }
    return Promise.all(queue);
  }

  insertMsg(insertResult, data, dataType) {
    let count = data ? data.length : null;
    let msg = ['Inserted', insertResult.result.n];
    if (count) {
      msg.push('of');
      msg.push(count);
    }
    if (dataType) msg.push(dataType);
    return msg.join(' ');
  }}exports.Db = Db;var _default =

Db;exports.default = _default;
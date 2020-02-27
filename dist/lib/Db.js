"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.Db = void 0;var _mongodb = require("mongodb");


const connectionOptions = { useNewUrlParser: true, useUnifiedTopology: true };
class Db {
  constructor(config) {
    config = config || {};
    this.server = config.server || 'localhost';
    this.port = config.port || 27017;
    this.dbName = config.database || config.db;
    if (!this.dbName) throw new Error('Missing database name');
    const user = config.user;
    const password = config.password;
    let url = 'mongodb://';
    if (user && password) url += `${user}:${password}@`;
    url += `${this.server}:${this.port}/${this.dbName}`;
    this.url = url;
    this.client = null;
    this.log = config.Logger || console;
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
      let client = await this.connect();
      let db = client.db(this.dbName);
      return db;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  setLogger(log) {
    this.log = log;
  }

  async createCollection(collectionName, { indexes, options }, { dropIndexes, validate } = {}) {
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
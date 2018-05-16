'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCollection = createCollection;
exports.insertMsg = insertMsg;

var _mongodb = require('mongodb');

class Db {
  constructor(config) {
    config = config || {};
    this.server = config.server;
    this.port = config.port;
    this.dbName = config.database;
    const user = config.user;
    const password = config.password;
    let url = 'mongodb://';
    if (user && password) url += `${user}:${password}@`;
    url += `${this.server}:${this.port}/${this.dbName}`;
    this.url = url;
    this.client = null;

    this.connect = function () {
      if (!this.client) this.client = _mongodb.MongoClient.connect(this.url);
      return this.client;
    };

    this.db = async function () {
      let client = await this.connect();
      let db = await client.db(this.dbName);
      return db;
    };
    this.connect();
  }
}

function createCollection(db, collectionName, indexes) {
  if (!collectionName) return Promise.reject('Invalid collection name');
  let collection = db.collection(collectionName);
  if (!indexes || !indexes.length) return Promise.resolve(collection);
  return collection.createIndexes(indexes).then(doc => {
    return collection;
  });
}

function insertMsg(insertResult, data, dataType) {
  let count = data ? data.length : null;
  let msg = ['Inserted', insertResult.result.n];
  if (count) {
    msg.push('of');
    msg.push(count);
  }
  if (dataType) msg.push(dataType);
  return msg.join(' ');
}

exports.default = Db;
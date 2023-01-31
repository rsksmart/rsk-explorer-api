"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.StoredConfig = StoredConfig;exports.default = exports.readOnlyError = void 0;
var _config = _interopRequireDefault(require("./config"));
var _config2 = require("../repositories/config.repository");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const collectionName = _config.default.collectionsNames.Config;

const readOnlyError = id => `The doc with _id ${id} is read only`;exports.readOnlyError = readOnlyError;

function StoredConfig(db, readOnlyDocsIds = []) {
  const storage = db.collection(collectionName);
  const isReadOnly = _id => readOnlyDocsIds.includes(_id);
  const isValidId = id => typeof id === 'string';
  const get = async _id => {
    try {
      const doc = await _config2.configRepository.findOne({ _id }, {}, storage);
      if (doc) {
        // Remove all underscored properties
        for (let prop in doc) {
          if (prop[0] === '_') delete doc[prop];
        }
      }
      return doc;
    } catch (err) {
      return Promise.reject(err);
    }
  };
  const save = async (id, doc) => {
    try {
      if (!id || !isValidId(id)) throw new Error(`Invalid id ${id}`);
      if (isReadOnly(id)) {
        let exists = await get(id);
        if (exists) throw new Error(readOnlyError(id));
      }
      const newDoc = Object.assign({}, doc);
      newDoc._id = id;
      newDoc._created = Date.now();
      const res = await _config2.configRepository.insertOne(newDoc, storage);
      return res;
    } catch (err) {
      return Promise.reject(err);
    }
  };
  const update = async (_id, doc, { create } = {}) => {
    try {
      if (!_id) throw new Error(`Missing doc._id`);
      if (isReadOnly(_id)) throw new Error(readOnlyError(_id));
      const newDoc = Object.assign({}, doc);

      const options = {};
      if (create) {
        let old = await get(_id);
        if (!old) return save(_id, newDoc);
      }
      newDoc._updated = Date.now();
      let res = await _config2.configRepository.updateOne({ _id }, { $set: newDoc }, options, storage);
      return res;
    } catch (err) {
      return Promise.reject(err);
    }
  };

  return Object.freeze({ save, get, update });
}var _default =

StoredConfig;exports.default = _default;
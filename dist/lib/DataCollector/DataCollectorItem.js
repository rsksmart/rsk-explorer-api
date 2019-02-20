'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.DataCollectorItem = undefined;exports.





























































































































formatResponse = formatResponse;exports.






getFieldsTypes = getFieldsTypes;exports.











filterSort = filterSort;exports.










fieldFilterParse = fieldFilterParse;var _mongodb = require('mongodb');var _pagination = require('./pagination');var _types = require('../../lib/types');class DataCollectorItem {constructor(collection, key, parent, { cursorField = '_id', sortDir = -1, sortable = { _id: -1 } } = {}) {if (!(collection instanceof _mongodb.Collection)) {throw new Error('Collection is not mongodb Collection');}this.db = collection;this.key = key;this.parent = parent;this.fieldsTypes = null;this.cursorField = cursorField;this.cursorData = null;this.sortDir = sortDir;sortable[cursorField] = sortDir;this.sortableFields = sortable;this.sort = { [cursorField]: sortDir };this.publicActions = {};this.fields = {};}getDefaultsFields() {return Object.assign({}, this.fields);}async run(action, params) {try {const f = this.publicActions[action];if (f && typeof f === 'function') return f(params);else throw new Error(`Unknown action: ${action}`);} catch (err) {return Promise.reject(err);}}async find(query, sort, limit, project) {let collection = this.db;project = project || this.getDefaultsFields();let data = await (0, _pagination.find)(collection, query, sort, limit, project);return { data };}getOne(query, project) {project = project || this.getDefaultsFields();return this.db.findOne(query, project).then(data => {return { data };});}async setFieldsTypes() {let types = await getFieldsTypes(this.db);this.fieldsTypes = types;return types;}async getFieldsTypes() {let types = this.fieldsTypes;return types || this.setFieldsTypes();}responseParams(params) {let sort = params.sort || this.sort || {};let sortable = this.sortableFields;let defaultSort = this.sort;let sortDir = this.sortDir;let { limit, next, prev, fields, count, countOnly, page, getPages } = params;if (!fields) fields = this.getDefaultsFields();sort = filterSort(sort, sortable, defaultSort);return { sort, sortable, defaultSort, sortDir, limit, next, prev, fields, count, countOnly, page, getPages };}async getCursorData() {let data = this.cursorData;if (!data) data = await this.setCursorData();return data;}async setCursorData() {const cursorField = this.cursorField;const types = await this.getFieldsTypes();const cursorType = types[cursorField];this.cursorData = { cursorField, cursorType, fields: types };return this.cursorData;}getPageData(query, params) {return this.getPages({ query, params });}getAggPageData(aggregate, params) {return this.getPages({ aggregate, params });}async getPrevNext(query, project, data) {try {let { cursorField } = this;project = project || this.getDefaultsFields();if (!data) data = (await this.getOne(query)).data;if (!data) return;let value = query[cursorField] || data[cursorField];if (undefined === value) throw new Error(`Missing ${cursorField} value`);let prev = (await (0, _pagination.find)(this.db, { [cursorField]: { $lt: value } }, { [cursorField]: -1 }, 1, project))[0];let next = (await (0, _pagination.find)(this.db, { [cursorField]: { $gt: value } }, { [cursorField]: 1 }, 1, project))[0];return { prev, data, next };} catch (err) {return Promise.reject(err);}}async getPages({ aggregate, query, params }) {try {let pages = this.responseParams(params);let cursorData = await this.getCursorData();query = aggregate || query;let args = [this.db, cursorData, query, pages];let result = aggregate ? await (0, _pagination.aggregatePages)(...args) : await (0, _pagination.findPages)(...args);return formatResponse(result, pages);} catch (err) {return Promise.reject(err);}}fieldFilterParse(field, value, query) {return fieldFilterParse(field, value, query);}}exports.DataCollectorItem = DataCollectorItem;function formatResponse(result, pages) {if (!result) return;let { data, pagination } = result;pages = Object.assign(pages, pagination);return { pages, data };}async function getFieldsTypes(collection) {let doc = await collection.findOne();let fields = {};for (let p in doc) {let value = doc[p];let type = typeof value;type = value instanceof _mongodb.ObjectID ? _types.OBJECT_ID : type;fields[p] = type;}return fields;}function filterSort(sort, sortable, defaultSort) {let filteredSort = {}; // allow only one field to user sort
  if (Object.keys(sort).length > 1) return defaultSort;for (let field in sort) {if (undefined !== sortable[field]) filteredSort[field] = sort[field];}return Object.keys(filteredSort).length > 0 ? filteredSort : defaultSort;} // value: string| array of searched values | Object: 'value':true|false
function fieldFilterParse(field, value, query) {query = query || {};let fieldQuery;
  let inArr = [];
  let ninArr = [];
  if (typeof value === 'string') {
    fieldQuery = value;
  } else if (Array.isArray(value)) {
    inArr = value;
  } else if (typeof value === 'object') {
    for (let p in value) {
      if (value[p]) inArr.push(p);else
      ninArr.push(p);
    }
  }
  if (inArr.length || ninArr.length) fieldQuery = {};
  if (inArr.length) fieldQuery['$in'] = inArr;
  if (ninArr.length) fieldQuery['$nin'] = ninArr;
  if (fieldQuery) query[field] = fieldQuery;
  return query;
}exports.default =

DataCollectorItem;
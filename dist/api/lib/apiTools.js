"use strict";Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, "errors", { enumerable: true, get: function () {return _types.errors;} });Object.defineProperty(exports, "MODULES", { enumerable: true, get: function () {return _types.MODULES;} });exports.getModulesNames = exports.getEnabledModules = exports.getModuleKey = exports.getDelayedFields = exports.formatError = exports.formatRes = exports.remove$ = exports.filterParams = exports.sanitizeQuery = exports.filterSort = exports.filterQuery = exports.filterFields = exports.getLimit = void 0;var _types = require("../../lib/types");
var _config = _interopRequireDefault(require("../../lib/config"));
var _utils = require("../../lib/utils");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const delayedFields = _config.default.api.delayedFields || {};
const { MAX_LIMIT, LIMIT, MIN_LIMIT } = _config.default.api;

const getLimit = limit => {
  limit = limit || LIMIT;
  limit = limit > MAX_LIMIT ? MAX_LIMIT : limit;
  limit = limit < MIN_LIMIT ? MIN_LIMIT : limit;
  return limit;
};exports.getLimit = getLimit;

const filterFields = fields => {
  if (!fields) return;
  let filtered = {};
  for (let p in fields) {
    let k = remove$(p);
    filtered[k] = fields[p] ? 1 : 0;
  }
  return filtered;
};exports.filterFields = filterFields;

const filterQuery = query => {
  if (!query) return;
  if (Array.isArray(query)) return;
  if (typeof query === 'object') {
    if (Object.keys(query).length > 0) {
      return sanitizeQuery(query);
    }
  }
};exports.filterQuery = filterQuery;

const filterSort = sort => {
  if (!sort) return;
  let filtered = null;
  if (sort && typeof sort === 'object') {
    let keys = Object.keys(sort);
    filtered = {};
    for (let k of keys) {
      let val = sort[k];
      filtered[k] = !val || val === 1 ? 1 : -1;
    }
  }
  return retFiltered(filtered);
};exports.filterSort = filterSort;

const sanitizeQuery = query => {
  let filtered = {};
  for (let p in query) {
    if (p.replace('$') === p) {
      let value = query[p];
      filtered[p] = (0, _utils.isObj)(value) ? sanitizeQuery(value) : value;
    }
  }
  return retFiltered(filtered);
};exports.sanitizeQuery = sanitizeQuery;

const retFiltered = filtered => {
  return filtered && Object.keys(filtered).length > 0 ? filtered : null;
};

const filterParams = params => {
  params = params || {};
  let { limit, sort, fields, query } = params;
  params.limit = getLimit(limit);
  params.query = filterQuery(query);
  params.sort = filterSort(sort);
  params.fields = filterFields(fields);
  return params;
};exports.filterParams = filterParams;

const remove$ = value => value.replace('$', '');exports.remove$ = remove$;

const formatRes = payload => {
  let { module, action, result, req, error, channel } = payload;
  channel = channel || null;
  req = req || {};
  module = module ? getModuleKey(module) : null;
  let data, pages, next, prev, delayed;
  if (!result && !error) error = _types.errors.EMPTY_RESULT;
  if (error) {
    error = formatError(error);
  } else {
    ({ data, pages, next, prev, delayed } = result);
  }
  if (!data && !error) {
    const { getDelayed } = req;
    if (getDelayed && delayed && delayed.registry) {
      error = formatError(_types.errors.UPDATING_REGISTRY);
    } else {
      error = formatError(_types.errors.EMPTY_RESULT);
    }
  }
  return { module, channel, action, data, req, pages, error, prev, next, delayed };
};exports.formatRes = formatRes;

const formatError = error => {
  error.serverTime = Date.now();
  return error;
};exports.formatError = formatError;

const getDelayedFields = (module, action) => {
  let delayed = delayedFields[module] ? delayedFields[module][action] : null;
  if (delayed) delayed.module = module;
  return delayed;
};

// export const getModule = module => modules[module] || module
exports.getDelayedFields = getDelayedFields;
const getModuleKey = key => Object.keys(_types.MODULES)[Object.values(_types.MODULES).indexOf(key)] || key;exports.getModuleKey = getModuleKey;

const getEnabledModules = modules => Object.keys(modules).filter(m => modules[m] === true);exports.getEnabledModules = getEnabledModules;

const getModulesNames = modules => modules.map(k => _types.MODULES[k]);exports.getModulesNames = getModulesNames;
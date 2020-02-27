"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.generateTextQuery = generateTextQuery;function generateTextQuery($search, { field, matchCase, atStart } = {}) {
  let textQuery = { $text: { $search } };
  if (!field) return textQuery;
  let regexQuery = {};
  let flags = matchCase ? undefined : 'i';
  let re = atStart ? `^${$search}.*` : `.*${$search}.*`;
  let $regex = new RegExp(re, flags);
  regexQuery[field] = { $regex };
  return regexQuery;
}
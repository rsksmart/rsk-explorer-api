"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.generateBucketQuery = exports.generateBuckets = void 0;const generateBuckets = (field, { bucketSize, startValue, output, endValue } = {}) => {
  if (typeof field !== 'string') throw new Error(`Field must be a string`);
  // let reverse = ($sort && $sort[field]) ? $sort[field] === -1 : false

  let groupBy = `$${field}`;

  let limit = startValue + bucketSize;
  endValue = endValue || limit;
  let boundaries = [startValue, limit];
  while (endValue > limit) {
    limit += bucketSize;
    if (limit > endValue) limit = endValue;
    boundaries.push(limit);
  }
  let $match = {};
  $match[field] = { $gte: startValue, $lt: endValue };

  let $bucket = { groupBy, boundaries, default: 'next' };
  if (output) $bucket.output = output;
  return { $match, $bucket };
};exports.generateBuckets = generateBuckets;

const generateBucketQuery = (field, options) => {
  const { $match, $bucket } = generateBuckets(field, options);
  return [{ $match }, { $bucket }];
};exports.generateBucketQuery = generateBucketQuery;
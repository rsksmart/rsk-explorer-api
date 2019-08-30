"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.DifficultyCalculator = void 0;var _bignumber = require("bignumber.js");

class DifficultyCalculator {
  /**
                               * Given an array of blocks, a period of time and a bucket size. Returns an array with the average
                               * block difficulty for each bucket.
                               *
                               * @param {*} blocks An array of blocks with timestamp and difficulty
                               * @param {*} tstart Period start time
                               * @param {*} tend Period end time
                               * @param {*} bucketSize Bucket time size to divide the period in
                               */
  difficulties(blocks, tstart, tend, bucketSize) {
    if (!Array.isArray(blocks) || tend < tstart) {
      return [];
    }

    let buckets = {};

    for (let i = 0; i <= tend - tstart; i += bucketSize) {
      const bucket = tstart + i;
      buckets[bucket] = [];
    }

    for (const b of blocks) {
      const bucketNumber = Math.floor((b.timestamp - tstart) / bucketSize);
      const key = tstart + bucketNumber * bucketSize;

      if (buckets[key]) {buckets[key].push(new _bignumber.BigNumber(b.difficulty));}
    }

    let result = Object.keys(buckets).map(k => {
      const values = buckets[k];

      const average = values.length ? values.reduce((a, b) => a.plus(b), new _bignumber.BigNumber(0)).dividedBy(values.length) : new _bignumber.BigNumber(0);

      return {
        timestamp: k,
        avg: average };

    });

    return result;
  }}exports.DifficultyCalculator = DifficultyCalculator;
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.HashrateCalculator = exports.EXA = exports.DECIMALS = void 0;var _bignumber = require("bignumber.js");

const DECIMALS = 3;exports.DECIMALS = DECIMALS;
const EXA = new _bignumber.BigNumber('1e50');exports.EXA = EXA;

class HashrateCalculator {
  difficultyPerMiner(blocks) {
    const diffPerMiner = {};

    for (const block of blocks) {
      if (Object.keys(diffPerMiner).indexOf(block.miner) === -1) {
        diffPerMiner[block.miner] = new _bignumber.BigNumber(0);
      }

      const bnDiff = new _bignumber.BigNumber(block.difficulty);
      diffPerMiner[block.miner] = diffPerMiner[block.miner].plus(bnDiff);
    }

    return diffPerMiner;
  }

  hashratePercentagePerMiner(blocks) {
    if (!Array.isArray(blocks)) {
      return {};
    }

    if (!blocks.length) {
      return {};
    }

    const diffPerMiner = this.difficultyPerMiner(blocks);

    let percPerMiner = this.innerHashratePercentagePerMiner(diffPerMiner);

    return percPerMiner;
  }

  hashratePerMiner(blocks) {
    if (!Array.isArray(blocks)) {
      return {};
    }

    if (!blocks.length) {
      return {};
    }

    let diffPerMiner = this.difficultyPerMiner(blocks);

    let hashratePerMiner = this.innerHashratePerMiner(blocks, diffPerMiner);

    return hashratePerMiner;
  }

  hashrates(blocks) {
    if (!Array.isArray(blocks)) {
      return {};
    }

    if (!blocks.length) {
      return {};
    }

    let diffPerMiner = this.difficultyPerMiner(blocks);

    let hashratePerMiner = this.innerHashratePerMiner(blocks, diffPerMiner);
    let percPerMiner = this.innerHashratePercentagePerMiner(diffPerMiner);

    let hashrates = {};

    for (const m of Object.keys(diffPerMiner)) {
      hashrates[m] = {
        avg: hashratePerMiner[m],
        perc: percPerMiner[m] };

    }

    return hashrates;
  }

  innerHashratePercentagePerMiner(diffPerMiner) {
    const totalDiff = Object.values(diffPerMiner).reduce((prev, next) => prev.plus(next), new _bignumber.BigNumber(0));

    let percPerMiner = {};
    for (const m of Object.keys(diffPerMiner)) {
      percPerMiner[m] = diffPerMiner[m].dividedBy(totalDiff).toFixed(DECIMALS);
    }

    return percPerMiner;
  }

  innerHashratePerMiner(blocks, diffPerMiner) {
    const start = new _bignumber.BigNumber(blocks[0].timestamp);
    const end = new _bignumber.BigNumber(blocks[blocks.length - 1].timestamp);
    const timeDiff = end.isGreaterThan(start) ? end.minus(start) : new _bignumber.BigNumber(1);

    let hashratePerMiner = {};
    for (const m of Object.keys(diffPerMiner)) {
      const val = diffPerMiner[m].dividedBy(timeDiff).dividedBy(EXA).toFixed(DECIMALS);
      hashratePerMiner[m] = `${val} EHs`;
    }

    return hashratePerMiner;
  }}exports.HashrateCalculator = HashrateCalculator;
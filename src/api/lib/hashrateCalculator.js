import { BigNumber } from 'bignumber.js'

export const DECIMALS = 3
export const EXA = new BigNumber('1e18')

export class HashrateCalculator {
  difficultyPerMiner (blocks) {
    const diffPerMiner = {}

    for (const block of blocks) {
      if (Object.keys(diffPerMiner).indexOf(block.miner) === -1) {
        diffPerMiner[block.miner] = new BigNumber(0)
      }

      const bnDiff = new BigNumber(block.difficulty)
      diffPerMiner[block.miner] = diffPerMiner[block.miner].plus(bnDiff)
    }

    return diffPerMiner
  }

  hashratePercentagePerMiner (blocks) {
    if (!Array.isArray(blocks)) {
      return {}
    }

    if (!blocks.length) {
      return {}
    }

    const diffPerMiner = this.difficultyPerMiner(blocks)

    let percPerMiner = this.innerHashratePercentagePerMiner(diffPerMiner)

    return percPerMiner
  }

  hashratePerMiner (blocks, timeSpan) {
    if (!Array.isArray(blocks)) {
      return {}
    }

    if (!blocks.length) {
      return {}
    }

    let diffPerMiner = this.difficultyPerMiner(blocks)

    let hashratePerMiner = this.innerHashratePerMiner(blocks, diffPerMiner, timeSpan)

    return hashratePerMiner
  }

  hashrates (blocks, timeSpan) {
    if (!Array.isArray(blocks)) {
      return {}
    }

    if (!blocks.length) {
      return {}
    }

    let diffPerMiner = this.difficultyPerMiner(blocks)

    let hashratePerMiner = this.innerHashratePerMiner(blocks, diffPerMiner, timeSpan)
    let percPerMiner = this.innerHashratePercentagePerMiner(diffPerMiner)

    let hashrates = {}

    for (const m of Object.keys(diffPerMiner)) {
      hashrates[m] = {
        avg: hashratePerMiner[m],
        perc: percPerMiner[m]
      }
    }

    return hashrates
  }

  innerHashratePercentagePerMiner (diffPerMiner) {
    const totalDiff = Object.values(diffPerMiner).reduce((prev, next) => prev.plus(next), new BigNumber(0))

    let percPerMiner = {}
    for (const m of Object.keys(diffPerMiner)) {
      percPerMiner[m] = diffPerMiner[m].dividedBy(totalDiff).toFixed(DECIMALS)
    }

    return percPerMiner
  }

  innerHashratePerMiner (blocks, diffPerMiner, timeSpan) {
    if (timeSpan <= 0)
      timeSpan = 1;

    let hashratePerMiner = {}
    for (const m of Object.keys(diffPerMiner)) {
      const val = diffPerMiner[m].dividedBy(timeSpan).dividedBy(EXA).toFixed(DECIMALS)

      hashratePerMiner[m] = `${val} EHs`
    }

    return hashratePerMiner
  }
}

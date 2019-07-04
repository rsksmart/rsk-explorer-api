const BigNumber = require('bignumber.js');

export const DECIMALS = 3
export const EXA = new BigNumber('1e50')

export class HashrateCalculator {
    constructor() {
    }

    diffPerMiner(blocks) {
        const diffPerMiner = {}

        for (const block of blocks) {
            if (Object.keys(diffPerMiner).indexOf(block.miner) === -1) {
                diffPerMiner[block.miner] = new BigNumber(0);
            }

            const bnDiff = new BigNumber(block.difficulty);
            diffPerMiner[block.miner] = diffPerMiner[block.miner].plus(bnDiff);
        }

        return diffPerMiner
    }

    hashratePercentagePerMiner(blocks) {
        if (!Array.isArray(blocks)) {
            return {}
        }

        if (!blocks.length) {
            return {}
        }

        const diffPerMiner = this.diffPerMiner(blocks)

        const totalDiff = Object.values(diffPerMiner).reduce((prev, next) => prev.plus(next), new BigNumber(0))

        let percPerMiner = {}
        for (const m of Object.keys(diffPerMiner)) {
            percPerMiner[m] = diffPerMiner[m].dividedBy(totalDiff).toFixed(DECIMALS)
        }

        return percPerMiner;
    }

    hashratePerMiner(blocks) {
        if (!Array.isArray(blocks)) {
            return {}
        }

        if (!blocks.length) {
            return {}
        }

        let diffPerMiner = this.diffPerMiner(blocks)

        const start = new BigNumber(blocks[0].timestamp)
        const end = new BigNumber(blocks[blocks.length - 1].timestamp)
        const timeDiff = end.isGreaterThan(start) ? end.minus(start) :
                                                    new BigNumber(1)

        let hashratePerMiner = {}
        for (const m of Object.keys(diffPerMiner)) {
            const val = diffPerMiner[m].dividedBy(timeDiff).dividedBy(EXA).toFixed(DECIMALS)
            hashratePerMiner[m] = `${val} EHs`
        }

        return hashratePerMiner
    }
}

const BigNumber = require('bignumber.js');

export const PRECISION_DECIMALS = 3;

export class HashrateCalculator {
    constructor() {
    }

    hashratePercentagePerMiner(blocks) {
        if (!Array.isArray(blocks)) {
            return {}
        }

        if (!blocks.length) {
            return {}
        }

        const diffPerMiner = {}
        let totalDiff = new BigNumber(0);

        for (const block of blocks) {
            if (Object.keys(diffPerMiner).indexOf(block.miner) === -1) {
                diffPerMiner[block.miner] = new BigNumber(0);
            }

            const bnDiff = new BigNumber(block.difficulty);
            diffPerMiner[block.miner] = diffPerMiner[block.miner].plus(bnDiff);
            totalDiff = totalDiff.plus(bnDiff);
        }

        for (const m of Object.keys(diffPerMiner)) {
            diffPerMiner[m] = diffPerMiner[m].dividedBy(totalDiff).toPrecision(PRECISION_DECIMALS);
        }

        return diffPerMiner;
    }
}

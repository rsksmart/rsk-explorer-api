import { DataCollectorItem } from '../lib/DataCollector'
import { HashrateCalculator } from '../lib/hashrateCalculator'

export const HASHRATE_PERIODS = {
    '1w': {
        depth: 20160
    },
    '1d': {
        depth: 2880
    },
    '1h': {
        depth: 120
    }
}

export class Hashrates extends DataCollectorItem {
    constructor (collection, key, parent) {
        super(collection, key, parent)
        this.hashrateCalculator = new HashrateCalculator()
        this.publicActions = {
            getHashrates: async (params) => {
                return {
                    data: await this.getHashrates(params.blockNumber)
                }
            }
        }
    }

    async getHashrates(blockNumber) {
        let hashrates = {}

        for (const period of Object.keys(HASHRATE_PERIODS)) {
            const depth = HASHRATE_PERIODS[period].depth
            const blocks = await this.db.find({ number: { $gte: blockNumber - depth, $lte: blockNumber } })
                .project({ _id: 0, miner: 1, difficulty: 1 })
                .toArray()

            hashrates[period] = this.hashrateCalculator.hashrates(blocks)
        }

        return hashrates
    }
}

export default Hashrates

import { DataCollectorItem } from '../lib/DataCollector'
import { HashrateCalculator } from '../lib/hashrateCalculator'
import { DifficultyCalculator } from '../lib/difficultyCalculator'

// 1 hour bucket size
const DIFFICULTY_BUCKET_SIZE = 3600000

export const PERIODS = {
  '1w': {
    timeLimit: 604800000
  },
  '1d': {
    timeLimit: 86400000
  },
  '1h': {
    timeLimit: 3600000
  }
}

export class ExtendedStats extends DataCollectorItem {
  constructor ({ Blocks }, key) {
    super(Blocks, key)
    this.hashrateCalculator = new HashrateCalculator()
    this.difficultyCalculator = new DifficultyCalculator()
    this.publicActions = {
      getExtendedStats: async (params) => {
        return {
          data: await this.getExtendedStats(params.blockNumber)
        }
      },
      getHashrates: async (params) => {
        return {
          data: await this.getHashrates(params.blockNumber)
        }
      },
      getDifficulties: async (params) => {
        return {
          data: await this.getDifficulties(params.blockNumber)
        }
      }
    }
  }

  async getExtendedStats (blockNumber) {
    let extendedStats = {
      difficulties: {},
      hashrates: {}
    }

    const block = await this.db.findOne({ number: blockNumber })
    const end = block.timestamp

    for (const period of Object.keys(PERIODS)) {
      const timeLimit = PERIODS[period].timeLimit
      const start = end - timeLimit

      const blocks = await this.db.find({ timestamp: { $gte: start, $lte: end } })
        .project({ _id: 0, miner: 1, timestamp: 1, difficulty: 1 })
        .toArray()

      extendedStats.hashrates[period] = this.hashrateCalculator.hashrates(blocks)
      extendedStats.difficulties[period] = this.difficultyCalculator.difficulties(blocks, start, end, DIFFICULTY_BUCKET_SIZE)
    }

    return extendedStats
  }

  async getHashrates (blockNumber) {
    let hashrates = {}

    const block = await this.db.findOne({ number: blockNumber })
    const blockDate = block.timestamp

    for (const period of Object.keys(PERIODS)) {
      const timeLimit = PERIODS[period].timeLimit

      const blocks = await this.db.find({ timestamp: { $gte: blockDate - timeLimit, $lte: blockDate } })
        .project({ _id: 0, miner: 1, difficulty: 1 })
        .toArray()

      hashrates[period] = this.hashrateCalculator.hashrates(blocks)
    }

    return hashrates
  }

  async getDifficulties (blockNumber) {
    let difficulties = {}

    const block = await this.db.findOne({ number: blockNumber })
    const end = block.timestamp

    for (const period of Object.keys(PERIODS)) {
      const timeLimit = PERIODS[period].timeLimit
      const start = end - timeLimit

      const blocks = await this.db.find({ timestamp: { $gte: start, $lte: end } })
        .project({ _id: 0, timestamp: 1, difficulty: 1 })
        .toArray()

      difficulties[period] = this.difficultyCalculator.difficulties(blocks, start, end, DIFFICULTY_BUCKET_SIZE)
    }

    return difficulties
  }
}

export default ExtendedStats

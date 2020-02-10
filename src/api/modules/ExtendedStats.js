import { DataCollectorItem } from '../lib/DataCollector'
import { HashrateCalculator } from '../lib/hashrateCalculator'
import { DifficultyCalculator } from '../lib/difficultyCalculator'

// 1 hour bucket size
const DIFFICULTY_BUCKET_SIZE = 3600

export const PERIODS = {
  '1w': {
    timeSpan: 604800
  },
  '1d': {
    timeSpan: 86400
  },
  '1h': {
    timeSpan: 3600
  }
}

export class ExtendedStats extends DataCollectorItem {
  constructor ({ Blocks }, key) {
    super(Blocks, key)
    this.hashrateCalculator = new HashrateCalculator()
    this.difficultyCalculator = new DifficultyCalculator()
    this.publicActions = {
      /**
       * @swagger
       * /api?module=extendedStats&action=getExtendedStats:
       *    get:
       *      description: get extended stats
       *      tags:
       *        - extendedStats
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [extendedStats]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getExtendedStats]
       *        - name: blockNumber
       *          in: query
       *          schema:
       *            type: string
       *            example: 200
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      getExtendedStats: async (params) => {
        return {
          data: await this.getExtendedStats((parseInt(params.blockNumber)))
        }
      },
      /**
       * @swagger
       * /api?module=extendedStats&action=getHashrates:
       *    get:
       *      description: get hashrates
       *      tags:
       *        - extendedStats
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [extendedStats]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getHashrates]
       *        - name: blockNumber
       *          in: query
       *          schema:
       *            type: string
       *            example: 200
       *      responses:
       *        200:
       *          $ref: '#/definitions/Response'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
       */
      getHashrates: async (params) => {
        return {
          data: await this.getHashrates(parseInt(params.blockNumber))
        }
      },
      /**
      * @swagger
      * /api?module=extendedStats&action=getDifficulties:
      *    get:
      *      description: get difficulties
      *      tags:
      *        - extendedStats
      *      parameters:
      *        - name: module
      *          in: query
      *          required: true
      *          enum: [extendedStats]
      *        - name: action
      *          in: query
      *          required: true
      *          enum: [getDifficulties]
      *        - name: blockNumber
      *          in: query
      *          schema:
      *            type: string
      *            example: 200
      *      responses:
      *        200:
      *          $ref: '#/definitions/Response'
      *        400:
      *          $ref: '#/responses/BadRequest'
      *        404:
      *          $ref: '#/responses/NotFound'
      */
      getDifficulties: async (params) => {
        return {
          data: await this.getDifficulties(parseInt(params.blockNumber))
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
      const timeSpan = PERIODS[period].timeSpan
      const start = end - timeSpan

      const blocks = await this.db.find({ timestamp: { $gte: start, $lte: end } })
        .project({ _id: 0, miner: 1, timestamp: 1, difficulty: 1, cumulativeDifficulty: 1, uncles: 1 })
        .toArray()

      extendedStats.hashrates[period] = this.hashrateCalculator.hashrates(blocks, timeSpan)
      extendedStats.difficulties[period] = this.difficultyCalculator.difficulties(blocks, start, end, DIFFICULTY_BUCKET_SIZE)
    }

    return extendedStats
  }

  async getHashrates (blockNumber) {
    let hashrates = {}

    const block = await this.db.findOne({ number: blockNumber })
    const blockDate = block.timestamp

    for (const period of Object.keys(PERIODS)) {
      const timeSpan = PERIODS[period].timeSpan

      const blocks = await this.db.find({ timestamp: { $gte: blockDate - timeSpan, $lte: blockDate } })
        .project({ _id: 0, miner: 1, difficulty: 1, cumulativeDifficulty: 1, uncles: 1 })
        .toArray()

      hashrates[period] = this.hashrateCalculator.hashrates(blocks, timeSpan)
    }

    return hashrates
  }

  async getDifficulties (blockNumber) {
    let difficulties = {}

    const block = await this.db.findOne({ number: blockNumber })
    const end = block.timestamp

    for (const period of Object.keys(PERIODS)) {
      const timeSpan = PERIODS[period].timeSpan
      const start = end - timeSpan

      const blocks = await this.db.find({ timestamp: { $gte: start, $lte: end } })
        .project({ _id: 0, timestamp: 1, difficulty: 1, cumulativeDifficulty: 1, uncles: 1 })
        .toArray()

      difficulties[period] = this.difficultyCalculator.difficulties(blocks, start, end, DIFFICULTY_BUCKET_SIZE)
    }

    return difficulties
  }
}

export default ExtendedStats

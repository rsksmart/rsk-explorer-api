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
  constructor (key) {
    super(key)
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

    const query = { number: blockNumber }
    const block = await this.repository.findOne(query, {})
    const end = block.timestamp

    for (const period of Object.keys(PERIODS)) {
      const timeLimit = PERIODS[period].timeLimit
      const start = end - timeLimit
      const query = { timestamp: { gte: start, lte: end } }
      const project = { _id: 0, miner: 1, timestamp: 1, difficulty: 1 }
      const blocks = await this.repository.find(query, project)

      extendedStats.hashrates[period] = this.hashrateCalculator.hashrates(blocks)
      extendedStats.difficulties[period] = this.difficultyCalculator.difficulties(blocks, start, end, DIFFICULTY_BUCKET_SIZE)
    }

    return extendedStats
  }

  async getHashrates (blockNumber) {
    let hashrates = {}

    const query = { number: blockNumber }
    const block = await this.repository.findOne(query, {})
    const blockDate = block.timestamp

    for (const period of Object.keys(PERIODS)) {
      const timeLimit = PERIODS[period].timeLimit
      const query = { timestamp: { gte: blockDate - timeLimit, lte: blockDate } }
      const project = { _id: 0, miner: 1, difficulty: 1 }
      const blocks = await this.repository.find(query, project)

      hashrates[period] = this.hashrateCalculator.hashrates(blocks)
    }

    return hashrates
  }

  async getDifficulties (blockNumber) {
    let difficulties = {}

    const query = { number: blockNumber }
    const block = await this.repository.findOne(query, {})
    const end = block.timestamp

    for (const period of Object.keys(PERIODS)) {
      const timeLimit = PERIODS[period].timeLimit
      const start = end - timeLimit
      const query = { timestamp: { gte: start, lte: end } }
      const project = { _id: 0, timestamp: 1, difficulty: 1 }
      const blocks = await this.repository.find(query, project)

      difficulties[period] = this.difficultyCalculator.difficulties(blocks, start, end, DIFFICULTY_BUCKET_SIZE)
    }

    return difficulties
  }
}

export default ExtendedStats

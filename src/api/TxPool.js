import { DataCollector } from './lib/DataCollector'
import config from '../lib/config'
import { txPoolRepository } from '../repositories/txPool.repository'

const collectionName = config.collectionsNames.TxPool

export class TxPool extends DataCollector {
  constructor (db) {
    super(db, { collectionName })
    this.tickDelay = 1000
    this.state = {}
    this.chart = []
  }
  start () {
    super.start()
    this.updatePool()
  }

  tick () {
    this.updatePool()
  }

  async updatePool () {
    try {
      let pool = await this.getPool()
      if (pool && pool.timestamp !== this.state.timestamp) {
        this.state = Object.assign({}, pool)
        this.events.emit('newPool', this.getState())
        await this.updatePoolChart()
        this.events.emit('poolChart', this.getPoolChart())
      }
    } catch (err) {
      this.log.error(err)
    }
  }

  getPool () {
    return txPoolRepository.findOne({}, { sort: { _id: -1 } }, this.collection)
  }

  async updatePoolChart () {
    try {
      let chart = await txPoolRepository.find({}, { txs: 0 }, this.collection, { timestamp: -1 }, 200)
      this.chart = chart
    } catch (err) {
      return Promise.reject(err)
    }
  }

  getPoolChart () {
    let chart = this.chart.concat().reverse()
    return this.formatData(chart)
  }

  getState () {
    let state = Object.assign({}, this.state)
    delete state._id
    return this.formatData(state)
  }
}

export default TxPool

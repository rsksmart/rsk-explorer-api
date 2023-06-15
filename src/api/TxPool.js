import { DataCollector } from './lib/DataCollector'
import { txPoolRepository } from '../repositories/txPool.repository'

export class TxPool extends DataCollector {
  constructor () {
    super()
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
    return txPoolRepository.findOne({}, { sort: { _id: -1 } })
  }

  async updatePoolChart () {
    try {
      let chart = await txPoolRepository.find({}, { txs: 0 }, { timestamp: -1 }, 200)
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

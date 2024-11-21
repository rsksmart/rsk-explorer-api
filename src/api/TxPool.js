import { DataCollector } from './lib/DataCollector'
import { REPOSITORIES } from '../repositories'

export class TxPool extends DataCollector {
  constructor ({ log }) {
    super()
    this.log = log
    this.tickDelay = 15000
    this.state = {}
    this.chart = []
    this.repository = REPOSITORIES.TxPool
  }
  start () {
    super.start()
    this.log.info('Tx Pool started')
    this.tick()
  }

  tick () {
    this.updatePool()
  }

  async updatePool () {
    try {
      // this.log.debug(`Checking for new tx pools... (checking every ${this.tickDelay} ms)`)
      let pool = await this.getPool()
      if (pool && pool.timestamp !== this.state.timestamp) {
        // this.log.debug("New tx pool detected")
        this.state = Object.assign({}, pool)
        this.events.emit('newPool', this.getState())

        // this.log.debug("Updating tx pool chart...")
        await this.updatePoolChart()
        this.events.emit('poolChart', this.getPoolChart())
      } else {
        // this.log.debug("No new tx pool detected")
      }
    } catch (err) {
      this.log.error(err)
    }
  }

  getPool () {
    return this.repository.findOne({}, undefined, undefined, { id: 'desc' })
  }

  async updatePoolChart () {
    try {
      let chart = await this.repository.find({}, undefined, undefined, { timestamp: -1 }, 200)
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
    return this.formatData(state)
  }
}

export default TxPool

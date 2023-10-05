import { DataCollector } from './lib/DataCollector'

const collectionName = 'balance'

export class BalancePool extends DataCollector {
  constructor (db) {
    super(db, { collectionName })
    this.tickDelay = 1000
    this.state = {}
    this.chart = []
    this.addresses = []
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
      this.addresses.forEach(async (address) => {
        let pool = await this.getPool(address)
        // if (pool && pool.timestamp !== this.state.timestamp) {
        //   this.state = Object.assign({}, pool)
        //   this.events.emit('newPool', this.getState())
        //   await this.updatePoolChart()
        //   this.events.emit('poolChart', this.getPoolChart())
        // }
        this.events.emit('balanceUpdate', this.formatData({ address, value: pool }))
      })
    } catch (err) {
      this.log.error(err)
    }
  }

  getPool (address) {
    // return this.collection.findOne({}, { sort: { _id: -1 } })
    this.state.count = (this.state.count || 0) + 1
    return this.state.count
  }

  async updatePoolChart () {
    try {
      let chart = await this.collection.find({})
        .sort({ timestamp: -1 })
        .project({ txs: 0 })
        .limit(200)
        .toArray()
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

export default BalancePool

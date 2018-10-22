import { DataCollector } from '../lib/DataCollector'
import config from '../lib/config'

const perPage = config.api.perPage
const collectionName = config.blocks.collections.TxPool

export class TxPool extends DataCollector {
  constructor (db) {
    super(db, { perPage, collectionName })
    this.tickDelay = 1000
    this.state = {}
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
      }
    } catch (err) {
      this.log.error(err)
    }
  }
  getPool () {
    return this.collection.findOne({}, { sort: { _id: -1 } })
  }
  getState () {
    let state = Object.assign({}, this.state)
    delete state._id
    return this.formatData(state)
  }
}

export default TxPool

import { DataCollector } from './lib/DataCollector'
import config from '../lib/config'

const statusCollection = config.blocks.collections.Status
const blocksCollection = config.blocks.collections.Blocks

export class Status extends DataCollector {
  constructor (db) {
    super(db, { statusCollection })
    this.tickDelay = 5000
    this.state = {}
    this.addItem(statusCollection, 'Status', null, true)
    this.addItem(blocksCollection, 'Blocks', null, true)
  }
  tick () {
    this.updateState().then((newState) => {
      if (newState) {
        this.events.emit('newStatus', this.formatData(newState))
      }
    })
  }
  getState () {
    return this.formatData(this.state)
  }
  getBlocksServiceStatus () {
    return this.Status.find({}, { timestamp: -1 }, 1)
      .then(res => {
        res = res.data[0]
        delete (res._id)
        return res
      })
  }
  async updateState () {
    try {
      let status = await this.getStatus()
      status = status || {}
      let state = this.state
      let changed = Object.keys(status).find(k => status[k] !== state[k])
      if (changed) {
        let prevState = Object.assign({}, this.state)
        delete prevState.prevState
        status.prevState = prevState
        this.state = status
        return status
      }
    } catch (err) {
      this.log.warn(err)
    }
  }

  async getStatus () {
    try {
      const [blocksStatus, last, high, dbBlocks] =
        await Promise.all([
          this.getBlocksServiceStatus(),
          this.getLastblockReceived(),
          this.getHighestBlock(),
          this.getTotalBlocks()
        ])
      const status = Object.assign(blocksStatus, {
        dbLastBlockReceived: last.number,
        dbLastBlockReceivedTime: last._received,
        dbHighBlock: high.number,
        dbBlocks,
        dbMissingBlocks: high.number + 1 - dbBlocks,
        dbTime: Date.now()
      })
      return status
    } catch (err) {
      return Promise.reject(err)
    }
  }

  getHighestBlock () {
    return this.Blocks.db.findOne({}, { sort: { number: -1 }, limit: 1 })
  }
  getLastblockReceived () {
    return this.Blocks.db.findOne({}, { sort: { _received: -1 }, limit: 1 })
  }
  getTotalBlocks () {
    return this.Blocks.db.countDocuments({})
  }
}

export default Status

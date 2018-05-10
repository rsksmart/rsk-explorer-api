import { DataCollector, DataCollectorItem } from './DataCollector'
import config from './config'

const perPage = config.api.perPage
const statusCollection = config.blocks.statusCollection
const blocksCollection = config.blocks.blocksCollection


class Status extends DataCollector {
  constructor(db) {
    super(db, { perPage, statusCollection })
    this.state = {}
    this.addItem(statusCollection, 'Status', null, true)
    this.addItem(blocksCollection, 'Blocks', null, true)
  }
  tick () {
    this.updateState().then((newState) => {
      if (newState) {
        this.events.emit('newStatus', { DATA: newState })
      }
    })
  }
  getState () {
    return this.formatData(this.state)
  }
  getBlocksServiceStatus () {
    return this.Status.find({}, { timestamp: -1 }, 1)
      .then(res => {
        res = res.DATA[0]
        delete (res._id)
        return res
      })
  }
  async updateState () {
    let status = await this.getBlocksServiceStatus()
    let last = await this.getLastblock()
    let high = await this.getHighestBlock()
    let dbBlocks = await this.getTotalBlocks()
    status = Object.assign(status, {
      dbLastBlockInserted: last.number,
      dbHighBlock: high.number,
      dbBlocks
    })
    let state = this.state
    let changed = Object.keys(status).find(k => status[k] !== state[k])
    if (changed) {
      status.dbTime = Date.now()
      this.state = status
      return status
    }
  }
  getHighestBlock () {
    return this.Blocks.find({}, { number: -1 }, 1)
      .then(hBlock => hBlock.DATA[0])
  }
  getLastblock () {
    return this.Blocks.getOne()
      .then(lastBlock => lastBlock.DATA)
  }
  getTotalBlocks () {
    return this.Blocks.db.count({})
  }
}

export default Status
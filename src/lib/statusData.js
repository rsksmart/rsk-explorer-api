import { DataCollector, DataCollectorItem } from './DataCollector'
import config from './config'

const perPage = config.api.perPage
const statusCollection = config.blocks.statusCollection


class Status extends DataCollector {
  constructor(db) {
    super(db, { perPage, statusCollection })
    this.state = {}
    this.addItem(statusCollection, 'status', null, true)
  }
  tick () {
    let state = this.state
    this.updateState().then((newState) => {
      if (state.timestamp !== newState.timestamp) {
        this.events.emit('newStatus', newState)
      }
    })
  }
  getStatusFromDb () {
    return this.status.getOne({}).then((res) => {
      return res
    })
  }
  getState () {
    return this.formatData(this.state)
  }
  updateState () {
    return this.getStatusFromDb().then((status) => {
      status = status.DATA
      this.state = status
      return status
    })
  }
  dbStatus (blocks, lastBlock) {
    let missingBlocks = blocks - lastBlock.number

  }
}

export default Status
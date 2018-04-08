import { DataCollector, DataCollectorItem } from './dataCollector'
import config from './config'

const perPage = config.api.perPage
const statsCollection = config.blocks.statsCollection


class Stats extends DataCollector {
  constructor(db) {
    super(db, { perPage, statsCollection })
    this.state = {}
    this.addItem(statsCollection, 'stats', null, true)
  }
  tick () {
    let state = this.state
    this.updateState().then((newState) => {
      if (state.timestamp !== newState.timestamp) {
        this.events.emit('newStats', newState)
      }
    })
  }
  getStatsFromDb () {
    return this.stats.getOne({}).then((res) => {
      return res
    })
  }
  getState () {
    return this.formatData(this.state)
  }
  updateState () {
    return this.getStatsFromDb().then((stat) => {
      stat = stat.DATA
      this.state = stat
      return stat
    })
  }
  dbStatus (blocks, lastBlock) {
    let missingBlocks = blocks - lastBlock.number

  }
}

export default Stats
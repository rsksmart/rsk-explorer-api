import { DataCollector, DataCollectorItem } from './lib/DataCollector/'

export class Status extends DataCollector {
  constructor ({ log }) {
    super()
    this.log = log
    this.state = {}
    this.addModule(new DataCollectorItem('Status'))
    this.addModule(new DataCollectorItem('Blocks'))
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
  async getBlocksServiceStatus () {
    const Status = this.getModule('Status')
    const { data } = await Status.find({}, { timestamp: -1 }, 1)
    const [latestStatus] = data

    return latestStatus
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
      const status = Object.assign(blocksStatus || {}, {
        dbLastBlockReceived: last ? last.number : '',
        dbLastBlockReceivedTime: last ? last._received : '',
        dbHighBlock: high ? high.number : '',
        dbBlocks: dbBlocks >= 0 ? dbBlocks : '',
        dbMissingBlocks: high ? high.number + 1 - dbBlocks : '',
        dbTime: Date.now()
      })
      return status
    } catch (err) {
      return Promise.reject(err)
    }
  }

  getHighestBlock () {
    return this.getModule('Blocks').repository.findOne({}, { sort: { number: -1 } })
  }
  getLastblockReceived () {
    return this.getModule('Blocks').repository.findOne({}, { sort: { _received: -1 } })
  }
  getTotalBlocks () {
    return this.getModule('Blocks').repository.countDocuments({})
  }
}

export default Status

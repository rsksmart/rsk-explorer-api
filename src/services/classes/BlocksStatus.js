import { BlocksBase } from '../../lib/BlocksBase'
import { statusRepository } from '../../repositories/status.repository'
export class BlocksStatus extends BlocksBase {
  constructor (db, options) {
    super(db, options)
    this.Status = this.collections.Status
    this.Blocks = this.collections.Blocks
    this.requested = options.requested
    this.state = {}
    this.updateTime = 0
    this.delayDbUpdate = 500
  }

  async update (newState) {
    let connected = await this.nod3.isConnected()
    newState = newState || {}
    newState.nodeDown = !connected

    // this.log.debug(`newState: ${JSON.stringify(newState)}`)
    let state = Object.assign({}, this.state)
    let changed = Object.keys(newState).find(k => newState[k] !== state[k])
    this.state = Object.assign(state, newState)
    let timestamp = Date.now()
    let elapsedTime = timestamp - this.updateTime
    this.updateTime = timestamp
    if (changed && elapsedTime > this.delayDbUpdate) {
      newState = Object.assign(newState, { timestamp })
      return statusRepository.insertOne(newState, this.Status)
        .then(res => {
          return newState
        })
        .catch((err) => {
          this.log.debug(`Error inserting new status`)
          this.log.error(err)
        })
    } else {
      return Promise.resolve(this.state)
    }
  }

  getSavedState () {
    return this.Status.find({},
      {
        sort: { timestamp: -1 },
        limit: 1,
        projection: { _id: 0 }
      })
      .toArray().then(savedStatus => {
        return this.update(savedStatus[0])
      })
  }
}

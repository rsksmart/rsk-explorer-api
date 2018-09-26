import { BlocksBase } from '../../lib/BlocksBase'
export class BlocksStatus extends BlocksBase {
  constructor (db, options) {
    super(db, options)
    this.Status = this.collections.Status
    this.Blocks = this.collections.Blocks
    this.requested = options.requested
    this.state = {}
  }

  update (newState) {
    let connected = this.web3.isConnected()
    newState = newState || {}
    newState.nodeDown = !connected

    // this.log.debug(`newState: ${JSON.stringify(newState)}`)
    let state = Object.assign({}, this.state)
    let changed = Object.keys(newState).find(k => newState[k] !== state[k])
    this.state = Object.assign(state, newState)
    if (changed) {
      newState.timestamp = Date.now()
      return this.Status.insertOne(newState)
        .then(res => {
          return newState
        })
        .catch((err) => {
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

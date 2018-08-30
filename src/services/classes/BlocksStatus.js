export class BlocksStatus {
  constructor (db, Blocks) {
    this.db = db
    this.Blocks = Blocks
    this.web3 = Blocks.web3
    this.state = {}
    this.log = Blocks.log || console
    this.requestingBlocks = this.Blocks.requestingBlocks
  }

  update (newState) {
    let connected = this.web3.isConnected()
    newState = newState || {}
    newState.nodeDown = !connected
    newState.requestingBlocks = this.requestingBlocks.total()

    this.log.debug(`newState: ${JSON.stringify(newState)}`)
    let state = Object.assign({}, this.state)
    let changed = Object.keys(newState).find(k => newState[k] !== state[k])
    this.state = Object.assign(state, newState)
    if (changed) {
      newState.timestamp = Date.now()
      return this.db.insertOne(newState)
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
    return this.db.find({},
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

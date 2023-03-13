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

  async update (newState = {}) {
    let connected = await this.nod3.isConnected()
    newState.nodeDown = !connected

    let changed = Object.keys(newState).find(k => newState[k] !== this.state[k])

    Object.assign(this.state, newState)

    let timestamp = Date.now()
    let elapsedTime = timestamp - this.updateTime
    this.updateTime = timestamp

    if (changed && elapsedTime > this.delayDbUpdate) {
      newState = Object.assign(newState, { timestamp })

      try {
        await statusRepository.insertOne(newState, this.Status)
      } catch (error) {
        this.log.debug(`Error inserting new status`)
        this.log.error(error)
      }
    }
  }
}

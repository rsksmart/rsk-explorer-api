import config from './config'
import { EventEmitter } from 'events'
import { setInterval } from 'timers'
const perPage = config.api.perPage
import { filterParams } from './utils'

class Emitter extends EventEmitter {}
const emitter = new Emitter()

class Blocks {
  constructor(db) {
    this.db = db.collection(config.blocks.blockCollection)
    this.events = emitter
    this.lastLimit = config.api.lastBlocks
    this.filterParams = filterParams
    this.latest = 0
    this.last = []
    setInterval(() => {
      this.getLastBlocks()
    }, 1000)
  }

  paginator(query, params) {
    return this.db.count(query).then(total => {
      let pages = Math.ceil(total / params.limit)
      return { total, pages }
    })
  }
  getLastBlocks() {
    this.db
      .find()
      .sort({ number: -1 })
      .limit(this.lastLimit)
      .toArray((err, docs) => {
        if (err) console.log(err)
        else this.updateLastBlocks(docs)
      })
  }

  updateLastBlocks(blocks) {
    this.last = blocks
    let latest = blocks[0].number
    if (latest !== this.latest) {
      this.latest = latest
      this.events.emit('newBlocks', blocks)
    }
    //this.events.emit('newBlocks', blocks)
  }
}

export default Blocks

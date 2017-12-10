import config from './config'
import { EventEmitter } from 'events'
import { setInterval } from 'timers'

class Emitter extends EventEmitter {}
const emitter = new Emitter()

class Blocks {
  constructor(db) {
    this.collection = db.collection('blocks')
    this.events = emitter
    this.lastLimit = config.blocks.last
    this.latest = 0
    this.last = []
    this.getLastBlocks = () => {
      this.collection
        .find()
        .sort({ number: -1 })
        .limit(this.lastLimit)
        .toArray((err, docs) => {
          if (err) console.log(err)
          else this.updateLastBlocks(docs)
        })
    }
    this.updateLastBlocks = blocks => {
      this.last = blocks
      let latest = blocks[0].number
      if (latest !== this.latest) {
        this.latest = latest
        this.events.emit('newBlocks', blocks)
      }
      this.events.emit('newBlocks', blocks)
    }
    setInterval(() => {
      this.getLastBlocks()
    }, 1000)
  }
}

export default Blocks

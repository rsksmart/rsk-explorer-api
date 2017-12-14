import { DataCollector, DataCollectorItem } from './dataCollector'
import config from './config'
const perPage = config.api.perPage
const keyName = 'address'
const collectionName = config.blocks.blockCollection || 'blocks'

class Blocks extends DataCollector {
  constructor(db) {
    super(db, { perPage, collectionName })
    this.lastLimit = config.api.lastBlocks || 50
    this.latest = 0
    this.last = []
    this.Block = new Block(this.collection)
  }
  tick() {
    this.getLastBlocks()
  }

  run(action, params) {
    console.log(action, params)
    return this.itemPublicAction(action, params, this.Block)
  }
  getLastBlocks() {
    this.collection
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

class Block extends DataCollectorItem {
  constructor(collection) {
    super(collection)
    this.publicActions = {}
  }
}

export default Blocks

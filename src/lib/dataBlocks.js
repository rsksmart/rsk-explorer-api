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
    this.setLastBlocks()
  }

  run(action, params) {
    return this.itemPublicAction(action, params, this.Block)
  }
  setLastBlocks() {
    this.collection
      .find()
      .sort({ number: -1 })
      .limit(this.lastLimit)
      .toArray((err, docs) => {
        if (err) console.log(err)
        else this.updateLastBlocks(docs)
      })
  }

  getLastBlocks() {
    return { DATA: this.last }
  }

  updateLastBlocks(blocks) {
    this.last = blocks
    let latest = blocks[0].number
    if (latest !== this.latest) {
      this.latest = latest
      this.events.emit('newBlocks', { DATA: blocks })
    }
    //this.events.emit('newBlocks', blocks)
  }
}

class Block extends DataCollectorItem {
  constructor(collection) {
    super(collection)
    this.publicActions = {
      getBlock: params => {
        let number = parseInt(params.block)
        return this.getOne({ number })
      },
      getBlocks: params => {
        return this.getPageData({}, params, { number: -1 })
      },
      getTransaction: params => {
        let txHash = params.tx.toString()
        return this.getOne({ 'transactions.hash': txHash }).then(data => {
          let block = data.DATA
          if (block) {
            let transactions = block.transactions
            if (transactions) {
              let DATA = transactions.find(tx => {
                return tx.hash === txHash
              })
              return { DATA }
            }
          }
        })
      },
      getTransactions: params => {
        let aggregate = [
          { $project: { transactions: 1, timestamp: 1 } },
          { $unwind: '$transactions' }
        ]
        return this.getAggPageData(aggregate, params, { _id: -1 })
      }
    }
  }
}

export default Blocks

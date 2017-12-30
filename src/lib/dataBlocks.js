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
    return this.formatData(this.last)
  }

  updateLastBlocks(blocks) {
    this.last = blocks
    let latest = blocks[0].number
    if (latest !== this.latest) {
      this.latest = latest
      this.events.emit('newBlocks', this.formatData(blocks))
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
        if (number) {
          //let queryPrev = number > 1 ? { number: number-- } : null
          return this.getOnePrevNext(
            { number },
            { number: number - 1 },
            {
              number: number + 1
            }
          )
        }
      },
      getBlocks: params => {
        return this.getPageData({}, params, { number: -1 })
      },
      getTx: params => {
        let txHash = params.tx.toString()
        return this.getOne({
          transactions: { $elemMatch: { hash: txHash } }
        }).then(res => {
          let transactions
          if (res && res.DATA) transactions = res.DATA.transactions
          if (transactions) {
            let DATA = transactions.find(tx => {
              return tx.hash === txHash
            })
            return { DATA, transactions }
          }
        })
      },
      getTransaction: params => {
        return this.publicActions.getTx(params).then(res => {
          let DATA = res.DATA
          let transactions = res.transactions
          if (DATA && transactions) {
            let index = DATA.transactionIndex
            let PREV = transactions[index - 1]
            let NEXT = transactions[index + 1]
            if (PREV && NEXT) return { DATA, PREV, NEXT }
            else {
              let block = DATA.blockNumber
              return this.txBlock(block - 1).then(trans => {
                PREV = trans[trans.length - 1]
                return this.txBlock(block + 1).then(trans => {
                  NEXT = trans[0]
                  return { DATA, PREV, NEXT }
                })
              })
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
  txBlock(number) {
    return this.getOne({ number }).then(res => {
      return res && res.DATA ? res.DATA.transactions : null
    })
  }
}

export default Blocks

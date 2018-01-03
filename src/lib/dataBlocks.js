import { DataCollector, DataCollectorItem } from './dataCollector'
import config from './config'
const perPage = config.api.perPage
const blocksCollection = config.blocks.blockCollection || 'blocks'
const txCollection = config.blocks.txCollection || 'transactions'

class Blocks extends DataCollector {
  constructor(db) {
    let collectionName = blocksCollection
    super(db, { perPage, collectionName })
    this.lastLimit = config.api.lastBlocks || 50
    this.latest = 0
    this.lastBlocks = []
    this.lastTransactions = []
    this.txCollection = null
    this.setCollection(txCollection, 'txCollection')
    this.Block = new Block(this.collection, 'block')
    this.Tx = new Tx(this.txCollection, 'tx')
    this.items['block'] = this.Block
    this.items['tx'] = this.Tx
  }
  tick() {
    this.setLastBlocks()
  }

  run(action, params) {
    return this.itemPublicAction(action, params, '*')
  }
  setLastBlocks() {
    this.collection
      .find()
      .sort({ number: -1 })
      .limit(this.lastLimit)
      .toArray((err, blocks) => {
        if (err) console.log(err)
        else {
          this.txCollection
            .find()
            .sort({ _id: -1 })
            .limit(this.lastLimit)
            .toArray((err, txs) => {
              if (err) console.log(err)
              else {
                this.updateLastBlocks(blocks, txs)
              }
            })
        }
      })
  }

  getLastBlocks() {
    let blocks = this.lastBlocks
    let transactions = this.lastTransactions
    return this.formatData({ blocks, transactions })
  }

  updateLastBlocks(blocks, transactions) {
    this.lastBlocks = blocks
    this.lastTransactions = transactions
    let latest = blocks[0].number
    if (latest !== this.latest) {
      this.latest = latest
      this.events.emit('newBlocks', this.formatData({ blocks, transactions }))
    }
    //this.events.emit('newBlocks', blocks)
  }
}

class Block extends DataCollectorItem {
  constructor(collection) {
    super(collection)
    this.publicActions = {
      getBlock: params => {
        let number = parseInt(params.number)
        this.getPrevNext(
          params,
          { number: { $gt: number - 2 } },
          {},
          { number: 1 }
        ).then(res => {
          params.key = 'tx'
          Blocks.prototype
            .itemPublicAction('getBlockTransactions', params)
            .then(transactions => {
              console.log(transactions)
            })
        })
      },
      getBlocks: params => {
        return this.getPageData({}, params, { number: -1 })
      }
      /*       getTx: params => {
        let hash = params.hash.toString()
        return this.getOne({
          transactions: { $elemMatch: { hash } }
        }).then(res => {
          let transactions
          let timestamp
          if (res && res.DATA) {
            transactions = res.DATA.transactions
            timestamp = res.DATA.timestamp
          }
          if (transactions) {
            let DATA = transactions.find(tx => {
              return tx.hash === hash
            })
            DATA.timestamp = timestamp
            return { DATA, transactions }
          }
        })
      }, */
      /*       getTransaction: params => {
        return this.publicActions.getTx(params).then(res => {
          if (res && res.DATA) {
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
                  PREV = trans ? trans[trans.length - 1] : null
                  return this.txBlock(block + 1).then(trans => {
                    NEXT = trans ? trans[0] : null
                    return { DATA, PREV, NEXT }
                  })
                })
              }
            }
          }
        })
      }, */
      /*       getTransactions: params => {
        let aggregate = [
          { $project: { transactions: 1, timestamp: 1 } },
          { $unwind: '$transactions' }
        ]
        return this.getAggPageData(aggregate, params, { _id: -1 })
      } */
    }
  }
  /*   txBlock(number) {
    return this.getOne({ number }).then(res => {
      return res && res.DATA ? res.DATA.transactions : null
    })
  } */
}

class Tx extends DataCollectorItem {
  constructor(collection) {
    super(collection)
    this.publicActions = {
      getTransactions: params => {
        return this.getPageData({}, params, { _id: -1 })
      },
      getTransaction: params => {
        let hash = params.hash
        return this.getPrevNext(
          params,
          { hash: hash },
          {},
          { blockNumber: 1, transactionIndex: 1 }
        )
      },
      getBlockTransactions: params => {
        let blockNumber = params.blockNumber
        if (blockNumber) {
          return this.find({ blockNumber })
        }
      },
      getAccounts: params => {},
      getAccount: params => {}
    }
  }
}
export default Blocks

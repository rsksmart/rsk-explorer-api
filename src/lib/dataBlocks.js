import { DataCollector, DataCollectorItem } from './dataCollector'
import config from './config'
const perPage = config.api.perPage
const lastLimit = config.api.lastBlocks || 50

const blocks = config.blocks
const blocksCollection = blocks.blocksCollection
const txCollection = blocks.txCollection
const accountCollection = blocks.accountsCollection

class Blocks extends DataCollector {
  constructor(db) {
    let collectionName = blocksCollection
    super(db, { perPage, collectionName })
    this.lastLimit = lastLimit
    this.latest = 0
    this.lastBlocks = []
    this.lastTransactions = []
    this.txCollection = null
    this.accountCollection = null
    this.setCollection(txCollection, 'txCollection', this)
    this.setCollection(accountCollection, 'accountCollection', this)

    this.Block = new Block(this.collection, 'block', this)
    this.Tx = new Tx(this.txCollection, 'tx')
    this.Account = new Account(this.accountCollection, 'account')
    this.items['block'] = this.Block
    this.items['tx'] = this.Tx
    this.items['account'] = this.Account

  }
  tick () {
    this.setLastBlocks()
  }

  run (action, params) {
    return this.itemPublicAction(action, params, '*')
  }
  setLastBlocks () {
    this.collection
      .find()
      .sort({ number: -1 })
      .limit(this.lastLimit)
      .toArray((err, blocks) => {
        if (err) console.log(err)
        else {
          this.txCollection
            .find()
            .sort({ blockNumber: -1, transactionIndex: -1 })
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

  getLastBlocks () {
    let blocks = this.lastBlocks
    let transactions = this.lastTransactions
    return this.formatData({ blocks, transactions })
  }

  updateLastBlocks (blocks, transactions) {
    this.lastBlocks = blocks
    this.lastTransactions = transactions
    let latest
    if (blocks && blocks[0]) latest = blocks[0].number
    if (latest !== this.latest) {
      this.latest = latest
      this.events.emit('newBlocks', this.formatData({ blocks, transactions }))
    }
    //this.events.emit('newBlocks', blocks)
  }
}

class Block extends DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent)
    this.publicActions = {
      getBlock: params => {
        let number = parseInt(params.number)
        if (number)
          return this.getPrevNext(
            params,
            { number: number },
            { number: { $lte: number - 1 } },
            { number: { $lte: number + 1 } },
            { number: -1 }
          ).then(block => {
            if (block && block.DATA) {
              return this.parent
                .itemPublicAction('getBlockTransactions', {
                  blockNumber: block.DATA.number,
                  key: 'tx'
                })
                .then(txs => {
                  block.DATA.transactions = txs.DATA
                  return block
                })
            }
          })
      },
      getBlocks: params => {
        return this.getPageData({}, params, { number: -1 })
      }
    }
  }
}

class Tx extends DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent)
    this.publicActions = {
      getTransactions: params => {
      return this.getPageData({}, params, { _id: -1 })
      },
      getTransaction2: params => {
        let hash = params.hash
        return this.getPrevNext(
          params,
          { hash: hash },
          {},
          {},
          { blockNumber: 1, transactionIndex: 1 }
        )
      },
      getTransaction: params => {
        let hash = params.hash
        return this.db.findOne({ hash: { $eq: hash } }).then(tx => {
          if (!tx) return

          return this.getPrevNext(
            params,
            { hash: hash },
            {
              $or: [
                { transactionIndex: { $gt: tx.transactionIndex } },
                { blockNumber: { $gte: tx.blockNumber } }
              ]
            },
            {
              $and: [
                { transactionIndex: { $lt: tx.transactionIndex } },
                { blockNumber: { $lte: tx.blockNumber } }
              ]
            },
            { blockNumber: -1, transactionIndex: -1 }
          ).then(res => {
            //FIX IT
            res.NEXT = null
            res.PREV = null
            return res
          })
        })
      },
      getBlockTransactions: params => {
        let blockNumber = params.blockNumber
        if (blockNumber) {
          return this.find({ blockNumber })
        }
      },
      getAccountTransactions: params => {
        let address = params.address
        return this.getPageData(
          {
            $or: [{ from: address }, { to: address }]
          },
          params,
          { timestamp: -1 }
        ).then(res => {
          res.PARENT_DATA = { address, account: address }
          return res
        })
      }
    }
  }
}
class Account extends DataCollectorItem {
  constructor(collection, key, parent) {
    super(collection, key, parent)
    this.publicActions = {
      getAccount: params => { },
      getAccounts: params => {
        return this.getPageData({}, params, { _id: -1 })
      }
    }
  }
}
export default Blocks

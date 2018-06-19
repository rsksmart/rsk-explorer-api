import { DataCollector } from '../lib/DataCollector'
import config from '../lib/config'
import { Block } from './Block'
import { Tx } from './Tx'
import { Address } from './Address'
import { Event } from './Event'
import { TokenAccount } from './TokenAccount'
const perPage = config.api.perPage
const lastLimit = config.api.lastBlocks || 10
const c = config.blocks
const blocksCollection = c.blocksCollection
const txCollection = c.txCollection
const addrCollection = c.addrCollection
const eventsCollection = c.eventsCollection
const tokensAccountsCollection = c.tokenAddrCollection
class Blocks extends DataCollector {
  constructor (db) {
    let collectionName = blocksCollection
    super(db, { perPage, collectionName })
    this.lastLimit = lastLimit
    this.latest = 0
    this.lastBlocks = []
    this.lastTransactions = []
    this.addItem(blocksCollection, 'Block', Block, true)
    this.addItem(txCollection, 'Tx', Tx, true)
    this.addItem(addrCollection, 'Address', Address, true)
    this.addItem(eventsCollection, 'Event', Event, true)
    this.addItem(tokensAccountsCollection, 'TokenAccount', TokenAccount, true)
  }
  tick () {
    this.setLastBlocks()
  }

  run (action, params, item = '*') {
    return this.itemPublicAction(action, params, item)
  }
  setLastBlocks () {
    this.collection
      .find()
      .sort({ number: -1 })
      .limit(this.lastLimit)
      .toArray((err, blocks) => {
        if (err) console.log(err)
        else {
          this.Tx.db
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
  }

  async addAddressData (address, data, key = '_addressData') {
    const account = await this.Address.run('getAddress', { address })
    if (data && account) data.DATA[key] = account.DATA
    return data || account
  }
}

export default Blocks

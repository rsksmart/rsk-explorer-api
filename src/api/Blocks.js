import { DataCollector } from '../lib/DataCollector'
import config from '../lib/config'
import { txTypes } from '../lib/types'
import { Block } from './Block'
import { Tx } from './Tx'
import { Address } from './Address'
import { Event } from './Event'
import { TokenAccount } from './TokenAccount'
import { TxPending } from './TxPending'
const perPage = config.api.perPage
const lastLimit = config.api.lastBlocks || 10
const collections = config.blocks.collections
class Blocks extends DataCollector {
  constructor (db) {
    let collectionName = collections.Blocks
    super(db, { perPage, collectionName })
    this.lastLimit = lastLimit
    this.latest = 0
    this.lastBlocks = []
    this.lastTransactions = []
    this.addItem(collections.Blocks, 'Block', Block)
    this.addItem(collections.PendingTxs, 'TxPending', TxPending)
    this.addItem(collections.Txs, 'Tx', Tx)
    this.addItem(collections.Addrs, 'Address', Address)
    this.addItem(collections.Events, 'Event', Event)
    this.addItem(collections.TokensAddrs, 'Token', TokenAccount)
  }
  tick () {
    this.setLastBlocks()
  }

  run (module, action, params) {
    return this.itemPublicAction(module, action, params)
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
            .find({ txType: { $in: [txTypes.default, txTypes.contract] } })
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
  getLastBlock () {
    return this.lastBlocks[0] || null
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
    if (data && data.data && account) data.data[key] = account.data
    return data || account
  }
}

export default Blocks

import { DataCollector } from './lib/DataCollector'
import config from '../lib/config'
import { txTypes } from '../lib/types'
import { Block } from './modules/Block'
import { Tx } from './modules/Tx'
import { Address } from './modules/Address'
import { Event } from './modules/Event'
import { TokenAccount } from './modules/TokenAccount'
import { TxPending } from './modules/TxPending'
import getCirculatingSupply from './lib/getCirculatingSupply'

const lastLimit = config.api.lastBlocks || 10
const collections = config.blocks.collections

class Api extends DataCollector {
  constructor (db) {
    let collectionName = collections.Blocks
    super(db, { collectionName })
    this.lastLimit = lastLimit
    this.latest = 0
    this.lastBlocks = []
    this.lastTransactions = []
    this.circulatingSupply = null
    this.addItem(collections.Blocks, 'Block', Block)
    this.addItem(collections.PendingTxs, 'TxPending', TxPending)
    this.addItem(collections.Txs, 'Tx', Tx)
    this.addItem(collections.Addrs, 'Address', Address)
    this.addItem(collections.Events, 'Event', Event)
    this.addItem(collections.TokensAddrs, 'Token', TokenAccount)
  }
  tick () {
    this.setLastBlocks()
    this.setCirculatingSupply()
  }

  run (module, action, params) {
    return this.itemPublicAction(module, action, params)
  }

  async setLastBlocks () {
    try {
      let { collection, lastLimit, Tx } = this
      let blocks = await collection.find().sort({ number: -1 }).limit(lastLimit).toArray()
      let txs = await Tx.db.find({ txType: { $in: [txTypes.default, txTypes.contract] } })
        .sort({ blockNumber: -1, transactionIndex: -1 })
        .limit(this.lastLimit)
        .toArray()

      this.updateLastBlocks(blocks, txs)
    } catch (err) {
      console.log(err)
    }
  }

  async setCirculatingSupply () {
    try {
      const collection = this.db.collection(collections.Addrs)
      let circulating = await getCirculatingSupply(collection)
      this.circulatingSupply = Object.assign({}, circulating)
    } catch (err) {
      console.log(err)
    }
  }
  getCirculatingSupply () {
    return this.formatData(this.circulatingSupply)
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

  async getAddress (address) {
    return this.Address.run('getAddress', { address })
  }

  async addAddressData (address, data, key = '_addressData') {
    const account = await this.getAddress(address)
    if (data && data.data && account) data.data[key] = account.data
    return data || account
  }
}

export default Api

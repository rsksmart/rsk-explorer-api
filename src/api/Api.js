import { DataCollector } from './lib/DataCollector'
import config from '../lib/config'
import { txTypes } from '../lib/types'
import { Block } from './modules/Block'
import { Tx } from './modules/Tx'
import { Address } from './modules/Address'
import { Event } from './modules/Event'
import { TokenAccount } from './modules/TokenAccount'
import { TxPending } from './modules/TxPending'
import { Stats } from './modules/Stats'
import { Summary } from './modules/Summary'
import getCirculatingSupply from './lib/getCirculatingSupply'
import {
  filterParams,
  getDelayedFields,
  getModule
} from './lib/apiTools'
import Hashrates from './modules/Hashrate';

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
    this.stats = { timestamp: 0 }
    this.addItem(collections.Blocks, 'Block', Block)
    this.addItem(collections.PendingTxs, 'TxPending', TxPending)
    this.addItem(collections.Txs, 'Tx', Tx)
    this.addItem(collections.Addrs, 'Address', Address)
    this.addItem(collections.Events, 'Event', Event)
    this.addItem(collections.TokensAddrs, 'Token', TokenAccount)
    this.addItem(collections.Stats, 'Stats', Stats)
    this.addItem(collections.BlocksSummary, 'Summary', Summary)
    this.addItem(collections.Blocks, 'Hashrate', Hashrates)
  }
  tick () {
    this.setLastBlocks()
    this.setCirculatingSupply()
  }

  async run (payload) {
    try {
      if (Object.keys(payload).length < 1) throw new Error('invalid request')
      const action = payload.action
      if (!action) throw new Error('Missing action')
      const params = filterParams(payload.params)
      const module = getModule(payload.module)
      if (!module) throw new Error('Unknown module')
      const delayed = getDelayedFields(module, action)
      const time = Date.now()
      const result = await this.itemPublicAction(module, action, params)

      const queryTime = Date.now() - time
      const logCmd = (queryTime > 1000) ? 'warn' : 'trace'
      this.log[logCmd](`${module}.${action}(${JSON.stringify(params)}) ${queryTime} ms`)

      return { module, action, params, result, delayed }
    } catch (err) {
      return Promise.reject(err)
    }
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
      this.log.debug(err)
    }
  }

  async setCirculatingSupply () {
    try {
      const collection = this.db.collection(collections.Addrs)
      let circulating = await getCirculatingSupply(collection)
      this.circulatingSupply = Object.assign({}, circulating)
    } catch (err) {
      this.log.debug(err)
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
      this.updateStats()
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

  async updateStats () {
    const oldStats = this.stats
    const stats = await this.Stats.run('getLatest')
    if (!stats) return
    this.stats = Object.assign({}, stats)
    if (stats.timestamp !== oldStats.timestamp) {
      this.events.emit('newStats', this.stats)
    }
  }
}

export default Api

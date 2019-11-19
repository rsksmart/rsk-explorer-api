import { DataCollector } from './lib/DataCollector'
import { getEnabledApiModules } from './modules'
import { txTypes } from '../lib/types'
import getCirculatingSupply from './lib/getCirculatingSupply'
import { getDbBlocksCollections } from '../lib/blocksCollections'
import { filterParams, getDelayedFields, MODULES } from './lib/apiTools'
import config from '../lib/config'
import NativeContracts from '../lib/NativeContracts'

class Api extends DataCollector {
  constructor ({ db, initConfig }, { modules, collectionsNames, lastBlocks } = {}) {
    const collectionName = collectionsNames.Blocks
    super(db, { collectionName })
    this.collectionsNames = collectionsNames
    this.collections = getDbBlocksCollections(db)
    this.lastLimit = lastBlocks || 10
    this.latest = 0
    this.lastBlocks = []
    this.lastTransactions = []
    this.circulatingSupply = null
    this.stats = { timestamp: 0 }
    this.loadModules(getEnabledApiModules(modules))
    this.initConfig = initConfig
    const { isNativeContract } = NativeContracts(initConfig)
    this.isNativeContract = isNativeContract
  }
  tick () {
    this.setLastBlocks()
    this.setCirculatingSupply()
  }

  loadModules (modules) {
    Object.keys(modules).forEach(name => {
      const constructor = modules[name]
      if (typeof constructor === 'function') {
        const module = new constructor(this.collections, name)
        this.log.info(`Loading module ${name}`)
        this.addModule(module, name)
      }
    })
  }

  async run (payload) {
    try {
      if (Object.keys(payload).length < 1) throw new Error('invalid request')
      let { module, action, params } = payload
      if (!action) throw new Error('Missing action')
      const moduleName = MODULES[module]
      if (!moduleName) throw new Error('Unknown module')
      const delayed = getDelayedFields(moduleName, action)
      const time = Date.now()
      params = filterParams(payload.params)
      const result = await this.getModule(moduleName).run(action, params)
      const queryTime = Date.now() - time
      const logCmd = (queryTime > 1000) ? 'warn' : 'trace'
      this.log[logCmd](`${module}.${action}(${JSON.stringify(params)}) ${queryTime} ms`)
      const res = { module, action, params, result, delayed }
      return res
    } catch (err) {
      this.log.debug(err)
      return Promise.reject(err)
    }
  }

  info () {
    let info = Object.assign({}, this.initConfig)
    info.txTypes = Object.assign({}, txTypes)
    info.modules = config.api.modules
    return info
  }

  async setLastBlocks () {
    try {
      let { collection, lastLimit } = this
      const Tx = this.getModule('Tx')
      let blocks = await collection.find().sort({ number: -1 }).limit(lastLimit).toArray()
      let txs = await Tx.db.find({ txType: { $in: [txTypes.default, txTypes.contract] } })
        .sort({ _id: -1 })
        .limit(this.lastLimit)
        .toArray()

      this.updateLastBlocks(blocks, txs)
    } catch (err) {
      this.log.debug(err)
    }
  }

  async setCirculatingSupply () {
    try {
      const collection = this.collections.Addrs
      const { nativeContracts } = this.initConfig
      let circulating = await getCirculatingSupply(collection, nativeContracts)
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
    return this.getModule('Address').run('getAddress', { address })
  }

  async addAddressData (address, data, key = '_addressData') {
    const account = await this.getAddress(address)
    if (data && data.data && account) data.data[key] = account.data
    return data || account
  }

  getPendingTransaction (params) {
    return this.getModule('TxPending').run('getPendingTransaction', params)
  }

  async updateStats () {
    const oldStats = this.stats
    const stats = await this.getModule('Stats').run('getLatest')
    if (!stats) return

    const ExtendedStats = this.getModule('ExtendedStats')
    if (ExtendedStats) {
      const blockNumber = parseInt(stats.blockNumber)
      const extendedStats = await ExtendedStats.getExtendedStats(blockNumber)
      Object.assign(stats, extendedStats)
    }

    this.stats = Object.assign({}, stats)
    if (stats.timestamp !== oldStats.timestamp) {
      this.events.emit('newStats', this.stats)
    }
  }
}

export default Api

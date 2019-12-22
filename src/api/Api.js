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
    this.lastLimit = lastBlocks || 100
    this.latest = 0
    this.lastBlocks = {}
    this.lastTransactions = {}
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
      const Block = this.getModule('Block')
      const Tx = this.getModule('Tx')
      let limit = this.lastLimit
      let blocks = await Block.run('getBlocks', { limit, addMetadata: true })
      let query = { txType: [txTypes.default, txTypes.contract] }
      let transactions = await Tx.run('getTransactions', { query, limit })
      this.updateLastBlocks(blocks, transactions)
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
    let data = this.lastBlocks
    return this.formatData(data)
  }

  getLastTransactions () {
    let data = this.lastTransactions
    return this.formatData(data)
  }

  getLastBlock () {
    let { data } = this.lastBlocks
    return data[0] || null
  }

  updateLastBlocks (blocks, transactions) {
    let blockData = blocks.data
    this.lastBlocks = blocks
    this.lastTransactions = transactions
    let latest
    if (blockData && blockData[0]) latest = blockData[0].number
    if (latest !== this.latest) {
      this.latest = latest
      this.events.emit('newBlocks', this.getLastBlocks())
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
    const Stats = await this.getModule('Stats')
    if (!Stats) return
    const stats = await Stats.run('getLatest')
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

import { DataCollector } from './lib/DataCollector'
import { getEnabledApiModules } from './modules'
import { txTypes } from '../lib/types'
import { filterParams, getDelayedFields, MODULES } from './lib/apiTools'
import config from '../lib/config'
// It is used only in case Stats cannot provide the circulating supply
import getCirculatingSupply from './lib/getCirculatingSupply'

class Api extends DataCollector {
  constructor ({ initConfig, log }, { modules, lastBlocks } = {}) {
    super()
    this.log = log
    this.lastLimit = lastBlocks || 100
    this.latest = undefined
    this.lastBlocks = { data: [] }
    this.lastTransactions = { data: [] }
    this.balancesStatus = { data: {} }
    this.circulatingSupply = null
    this.stats = { timestamp: 0 }
    this.loadModules(getEnabledApiModules(modules))
    this.initConfig = initConfig
    this.tick()
  }
  tick () {
    this.setLastBlocks()
    this.updateBalancesStatus()
  }

  loadModules (modules) {
    Object.keys(modules).forEach(name => {
      const constructor = modules[name]
      if (typeof constructor === 'function') {
        const module = new constructor(name)
        this.log.info(`Loading module ${name}`)
        this.addModule(module, name)
      }
    })
  }

  async run (payload) {
    let { module, action, params } = payload
    try {
      if (Object.keys(payload).length < 1) throw new Error('invalid request')
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
      this.log.error(`${module}.${action}(${JSON.stringify(params)})`)
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
      const Block = this.getModule('Blocks')
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
  getStats () {
    return this.stats
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

  getBalancesStatus () {
    return this.balancesStatus
  }

  async updateBalancesStatus () {
    let data = await this.getModule('Balances').run('getStatus')
    this.balancesStatus = data
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

    /*     const ExtendedStats = this.getModule('ExtendedStats')
        if (ExtendedStats) {
          const blockNumber = parseInt(stats.blockNumber)
          const extendedStats = await ExtendedStats.getExtendedStats(blockNumber)
          Object.assign(stats, extendedStats)
        } */
    let circulatingSupply = stats.circulatingSupply || await this.getCirculatingSupplyFromDb()
    this.circulatingSupply = circulatingSupply
    this.stats = Object.assign({}, stats)
    let timestamp = stats.timestamp || 0
    if (timestamp > oldStats.timestamp) {
      this.events.emit('newStats', this.getStats())
    }
  }
  async getCirculatingSupplyFromDb () {
    return getCirculatingSupply(this.initConfig.nativeContracts)
  }
}

export default Api

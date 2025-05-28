import BlocksBase from '../../lib/BlocksBase'
import { convertUnixTimestampToISO } from '../../lib/utils'
import { isHexString, base64toHex } from '@rsksmart/rsk-utils'
import { REPOSITORIES } from '../../repositories'
export class TxPool extends BlocksBase {
  constructor (options) {
    super(options)
    this.status = {}
    this.pool = {}
    this.repository = REPOSITORIES.TxPool
    this.txPendingRepository = REPOSITORIES.TxPending
    this.started = false
    this.stopped = true
  }

  async start () {
    try {
      let connected = await this.nod3.isConnected()
      if (!connected) {
        this.log.debug('nod3 is not connected')
        return this.start()
      }

      if (this.started) return

      this.started = true
      this.stopped = false

      // status filter
      let status = await this.nod3.subscribe.method('txpool.status')
      status.watch(status => {
        if (!this.stopped) {
          this.updateStatus(status)
        }
      }, err => {
        this.log.debug(`Pool filter error: ${err}`)
      })
    } catch (err) {
      this.log.debug(`TxPool error: ${err}`)
    }
  }

  stop () {
    this.stopped = true
    this.started = false
  }

  updateStatus (newStatus) {
    const status = Object.assign({}, this.status)
    let changed = Object.keys(newStatus).find(k => newStatus[k] !== status[k])
    if (changed) {
      this.log.trace(`TxPool status changed: pending: ${newStatus.pending} queued: ${newStatus.queued}`)
      this.status = Object.assign({}, newStatus)
      this.updatePool()
    }
    // let action = this.actions.TXPOOL_UPDATE
    // process.send({ action, args: [status] })
  }
  async getPool () {
    try {
      let res = await this.nod3.batchRequest([
        ['txpool.content'],
        ['eth.blockNumber']
      ])
      if (res.length !== 2) throw new Error(`Invalid request ${res}`)
      return this.formatPool(res[0], res[1])
    } catch (err) {
      return Promise.reject(err)
    }
  }

  formatPool (pool, blockNumber) {
    let keys = Object.keys(pool)
    keys.forEach(k => { pool[k] = this.formatPoolProp(pool[k], k, blockNumber) })
    let totals = keys
      .reduce((o, v) => {
        o[v] = pool[v].length
        return o
      }, {})

    let txs = Object.values(pool).reduce((a, i) => a.concat(i), [])
    return Object.assign(totals, { txs, blockNumber })
  }

  formatPoolProp (prop, status) {
    let res = []
    Object.values(prop)
      .forEach(nonce => Object.values(nonce)
        .forEach(txs => txs.forEach(tx => {
          tx.status = String(status).toUpperCase()
          res.push(this.formatFields(tx))
        })))
    return res
  }

  // fix rskj txpool bad responses
  // see: https://github.com/rsksmart/rskj/issues/689
  formatFields (values) {
    let fields = ['hash', 'from', 'to']
    fields.forEach(f => { values[f] = this.add0x(values[f]) })

    // see: https://github.com/rsksmart/rskj/issues/689
    let input = values.input
    if (input) {
      input = (isHexString(input)) ? input : base64toHex(input)
      values.input = input
    }

    return values
  }

  // see: https://github.com/rsksmart/rskj/issues/689
  add0x (value) {
    if (value && isHexString(value) && !/^0x/.test(value)) value = `0x${value}`
    return value
  }

  async updatePool () {
    try {
      let pool = await this.getPool()
      if (!pool) throw new Error('getPool returns nothing')

      pool.timestamp = Date.now() // this is in milliseconds
      pool.datetime = convertUnixTimestampToISO(Math.floor(pool.timestamp / 1000))

      this.pool = pool
      return this.savePoolToDb(pool)
    } catch (err) {
      this.log.error(err)
      return Promise.reject(err)
    }
  }

  async savePoolToDb (pool) {
    try {
      this.log.trace(`Saving txPool to db`)
      const txpool = await this.repository.insertOne(pool)
      await this.savePendingTxs(pool.txs, txpool.id)
    } catch (err) {
      this.log.error(`Error saving txPool: ${err}`)
      return Promise.reject(err)
    }
  }

  async savePendingTxs (txs, poolId) {
    try {
      txs = txs || []
      const savedTxs = await Promise.all(txs.map(tx => this.txPendingRepository.upsertOne({ hash: tx.hash }, { tx, poolId })))
      return savedTxs
    } catch (err) {
      this.log.error(`Error saving pending transactions: ${err}`)
      return Promise.reject(err)
    }
  }
}

export function Pool (config) {
  return new TxPool(config)
}

export default Pool

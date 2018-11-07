import { BlocksBase } from '../../lib/BlocksBase'

export class TxPool extends BlocksBase {
  constructor (db, options) {
    super(db, options)
    this.status = {}
    this.pool = {}
    this.TxPool = this.collections.TxPool
    this.PendingTxs = this.collections.PendingTxs
  }

  async start () {
    try {
      let connected = await this.nod3.isConnected()
      if (!connected) {
        this.log.debug('nod3 is not connected')
        return this.start()
      }
      // status filter
      let status = await this.nod3.subscribe.method('txpool.status')
      status.watch(status => {
        this.updateStatus(status)
      }, err => {
        this.log.debug(`Pool filter error: ${err}`)
      })
    } catch (err) {
      this.log.debug(`TxPool error: ${err}`)
    }
  }

  updateStatus (newStatus) {
    const status = Object.assign({}, this.status)
    let changed = Object.keys(newStatus).find(k => newStatus[k] !== status[k])
    if (changed) {
      this.log.debug(`TxPool status changed: pending: ${newStatus.pending} queued: ${newStatus.queued}`)
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

  formatFields (values) {
    let fields = ['hash', 'from', 'to']
    fields.forEach(f => { values[f] = this.add0x(values[f]) })
    return values
  }

  add0x (value) {
    if (value && !/^0x/.test(value)) value = `0x${value}`
    return value
  }

  async updatePool () {
    try {
      let pool = await this.getPool()
      if (!pool) throw new Error('getPool returns nothing')
      pool.timestamp = Date.now()
      this.pool = pool
      return this.savePoolToDb(pool)
    } catch (err) {
      this.log.error(err)
      return Promise.reject(err)
    }
  }

  async savePoolToDb (pool) {
    try {
      this.log.debug(`Saving txPool to db`)
      await this.TxPool.insertOne(pool)
      await this.savePendingTxs(pool.txs)
    } catch (err) {
      this.log.error(`Error saving txPool: ${err}`)
      return Promise.reject(err)
    }
  }

  async savePendingTxs (txs) {
    try {
      txs = txs || []
      await Promise.all(txs.map(tx => this.PendingTxs.updateOne({ hash: tx.hash }, { $set: tx }, { upsert: true })))
    } catch (err) {
      this.log.error(`Error saving pending transactions: ${err}`)
      return Promise.reject(err)
    }
  }
}

export function Pool (db, config) {
  return new TxPool(db, config)
}

export default Pool

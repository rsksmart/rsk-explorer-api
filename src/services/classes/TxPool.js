import { BlocksBase } from '../../lib/BlocksBase'

export class TxPool extends BlocksBase {
  constructor (db, options) {
    super(db, options)
    this.status = {}
    this.pool = {}
    this.TxPool = this.collections.TxPool
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
        this.log.debug(`Pool error: ${err}`)
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
      let pool = await this.nod3.txpool.content()
      return this.formatPool(pool)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  formatPool (pool) {
    for (let p in pool) {
      pool[p] = this.formatPoolProp(pool[p])
    }
    return pool
  }

  formatPoolProp (prop) {
    let res = []
    Object.values(prop)
      .forEach(nonce => Object.values(nonce)
        .forEach(txs => txs.forEach(tx => res.push(tx))))
    return res
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
    } catch (err) {
      this.log.error(`Error saving txPool: ${err}`)
    }
  }
}

export function Pool (db, config) {
  return new TxPool(db, config)
}

export default Pool

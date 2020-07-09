import { BcThing } from './BcThing'
import { InternalTx } from './InternalTx'
import { getTimestampFromBlock } from './Tx'

export class TxTrace extends BcThing {
  constructor (hash, { traceData, timestamp, nod3, initConfig, log } = {}) {
    super({ nod3, initConfig, log })
    if (!this.isTxOrBlockHash(hash)) throw new Error(`TxTrace, ${hash} is not a tx hash`)
    this.hash = hash
    this.data = undefined
    this.traceData = traceData
    this.timestamp = timestamp
    if (traceData) this.setData(traceData)
  }
  setData (trace) {
    if (!Array.isArray(trace)) throw new Error('Invalid trace data')
    trace = trace.filter(d => d.transactionHash === this.hash)
    this.data = trace
    return this.getData()
  }
  async fetch (force) {
    try {
      let { fetched, nod3, hash, traceData, timestamp } = this
      if (fetched && !force) return this.getData()
      if (!traceData) {
        this.log.debug(`Trace transaction ${hash}`)
        traceData = await nod3.trace.transaction(hash)
      }
      if (!timestamp) {
        this.log.debug(`Getting transaction timestamp ${hash}`)
        timestamp = await getTimestampFromBlock(traceData, nod3)
      }
      this.traceData = traceData
      this.timestamp = timestamp
      this.setData(traceData)
      this.fetched = true
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }
  async createInternalTransactions (data) {
    try {
      let { initConfig, timestamp } = this
      return data.map(d => new InternalTx(Object.assign(d, { timestamp }), { initConfig }))
    } catch (err) {
      return Promise.reject(err)
    }
  }
  async getInternalTransactionsData (data) {
    try {
      await this.fetch()
      data = data || this.getData()
      let iTxs = await this.createInternalTransactions(data)
      let internalTransactions = iTxs.map(i => i.getData())
      let addresses = iTxs.map(i => i.getAddresses())
      // merge addresses arrays
      addresses = [].concat.apply([], addresses)
      return { internalTransactions, addresses }
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

export default TxTrace

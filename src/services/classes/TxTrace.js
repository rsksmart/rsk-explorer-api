import { BcThing } from './BcThing'
import { InternalTx } from './InternalTx'

export class TxTrace extends BcThing {
  constructor (hash, { traceData, nod3, initConfig } = {}) {
    super({ nod3, initConfig })
    if (!this.isTxOrBlockHash(hash)) throw new Error(`TxTrace, ${hash} is not a tx hash`)
    this.hash = hash
    this.data = undefined
    if (traceData) this.setData(traceData)
  }
  setData (trace) {
    if (!Array.isArray(trace)) throw new Error('Invalid trace data')
    trace = trace.filter(d => d.transactionHash === this.hash)
    trace = this.addTraceIndexes(trace)
    this.data = trace
    return this.getData()
  }
  async fetch (force) {
    try {
      let data = this.getData()
      if (data && !force) return data
      let { nod3, hash } = this
      let trace = await nod3.trace.transaction(hash)
      this.setData(trace)
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }
  addTraceIndexes (trace) {
    return trace.map((t, i) => {
      t._index = i
      return t
    })
  }
  async createInternalTransactions (data) {
    try {
      let { nod3, initConfig } = this
      return data.map(d => new InternalTx(d, { nod3, initConfig }))
    } catch (err) {
      return Promise.reject(err)
    }
  }
  async getInternalTransactionsData (data) {
    try {
      data = data || this.getData()
      let iTxs = await this.createInternalTransactions(data)
      let internalTxs = iTxs.map(i => i.getData())
      let addresses = iTxs.map(i => i.getAddresses())
      // merge addresses arrays
      addresses = [].concat.apply([], addresses)
      return { internalTxs, addresses }
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

export default TxTrace

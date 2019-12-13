import { BcThing } from './BcThing'
import { getInternalTxId } from '../../lib/ids'

const REQUIRED_FIELDS = [
  '_index',
  'blockHash',
  'blockNumber',
  'transactionHash',
  'transactionPosition',
  'type',
  'subtraces',
  'traceAddress',
  'result',
  'action']

export class InternalTx extends BcThing {
  constructor (data, { nod3, initConfig } = {}) {
    super({ nod3, initConfig })
    this.setData(data)
  }

  checkData (data) {
    if (typeof data !== 'object') throw new Error('Data is not an object')
    for (let field of REQUIRED_FIELDS) {
      if (!data.hasOwnProperty(field)) throw new Error(`Missing field: ${field}`)
    }
    return data
  }

  setData (data) {
    data = this.checkData(data)
    let id = getInternalTxId(data)
    if (!id) throw new Error(`Invalid internalTxId: ${id}`)
    data.internalTxId = id
    this.data = data
  }

  getAddresses () {
    let data = this.getData()
    let { action } = data
    let { isAddress } = this
    return Object.entries(action)
      .filter(a => {
        let [name, value] = a
        return name !== 'balance' && isAddress(value)
      }).map(v => v[1])
  }
}

export default InternalTx

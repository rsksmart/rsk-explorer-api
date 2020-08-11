import { BcThing } from './BcThing'
import { generateId } from '../../lib/ids'
import { isBlockHash } from '../../lib/utils'

const ITX_FIELDS = {
  blockNumber: null,
  transactionHash: isBlockHash,
  blockHash: isBlockHash,
  transactionPosition: null,
  type: null,
  subtraces: null,
  traceAddress: null,
  result: null,
  action: null,
  timestamp: null,
  _index: null
}

export class InternalTx extends BcThing {
  constructor (data, { initConfig }) {
    super({ initConfig })
    this.setData(data)
  }

  checkData (data) {
    return checkInternalTransactionData(data)
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
      .filter(([name, value]) => {
        return name !== 'balance' && isAddress(value)
      }).map(v => v[1])
  }
}

export function getInternalTxId ({ blockNumber, transactionPosition: transactionIndex, transactionHash: hash, _index: index }) {
  return generateId({ blockNumber, transactionIndex, hash, index })
}

export function filterValueAddresses (internalTransactions) {
  const addresses = new Set()
  internalTransactions.forEach(({ action, error }) => {
    let { value, from, to } = action
    if (!error && parseInt(value) > 0) {
      addresses.add(from)
      addresses.add(to)
      // review suicide and refund address
    }
  })
  return [...addresses]
}

export function checkInternalTransactionData (data) {
  if (typeof data !== 'object') throw new Error('Data is not an object')
  for (let field of Object.keys(ITX_FIELDS)) {
    if (!data.hasOwnProperty(field)) throw new Error(`Missing field: ${field}`)
    let value = data[field]
    let check = ITX_FIELDS[field]
    if (typeof check === 'function') {
      if (!check(data[field])) {
        throw new Error(`Invalid value: ${value} for itx field: ${field}`)
      }
    }
  }
  return data
}

export default InternalTx

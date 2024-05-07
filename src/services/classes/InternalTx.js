import { BcThing } from './BcThing'
import { generateId } from '../../lib/ids'
import { isBlockHash, isAddress } from '../../lib/utils'

const ITX_FIELDS = {
  blockNumber: null,
  transactionHash: isBlockHash,
  blockHash: isBlockHash,
  transactionPosition: null,
  type: checkInternatTransactionType,
  subtraces: null,
  traceAddress: Array.isArray,
  result: null,
  action: null,
  timestamp: null,
  _index: null
  // dynamic fields:
  // error
  // internalTxId (sortable id, added when loading entity)
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
    const internalTx = this.getData()
    const { action, type, result } = internalTx
    const addresses = Object.entries(action).filter(([name, value]) => name !== 'balance' && isAddress(value)).map(v => v[1])

    // scrape addresses from contracts created by contracts
    const isValidContractCreationItx = type === 'create' && result !== null

    if (isValidContractCreationItx) {
      // Creation by EOA: action.creationMethod = undefined
      // Creation by Contract (create opcode): action.creationMethod = 'create'
      // Creation by Contract (create2 opcode): action.creationMethod = 'create2'
      // Failed contract creation by Contract: result = null
      addresses.push(result.address)
    }

    return [...new Set(addresses)]
  }

  isSuicide () {
    let { type, action } = this.getData()
    return checkInternatTransactionType(type) === 'suicide' && isAddress(action.address)
  }
}

export function checkInternatTransactionType (type) {
  if (typeof type !== 'string') throw new Error(`Invalid itx type: ${type}`)
  return type
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

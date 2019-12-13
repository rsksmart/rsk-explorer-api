import { BcThing } from './BcThing'
import { formatEvent } from './Event'
import ContractParser from 'rsk-contract-parser'
import { txTypes } from '../../lib/types'
import { getTxOrEventId } from '../../lib/ids'

import TxTrace from './TxTrace'
import { Addresses } from './Addresses'
export class Tx extends BcThing {
  constructor (hash, timestamp, { addresses, txData, blockTrace, traceData, nod3, initConfig, notTrace } = {}) {
    if (!hash || !timestamp) throw new Error(`Tx, missing arguments`)
    super({ nod3, initConfig })
    if (!this.isTxOrBlockHash(hash)) throw new Error(`Tx, ${hash} is not a tx hash`)
    this.hash = hash
    this.timestamp = timestamp
    this.txData = txData
    this.toAddress = undefined
    if (blockTrace) traceData = this.getTraceDataFromBlock(blockTrace)
    this.addresses = addresses || new Addresses({ nod3, initConfig })
    this.trace = (!notTrace) ? new TxTrace(hash, { traceData, nod3, initConfig }) : undefined
  }
  getTraceDataFromBlock (blockTrace) {
    if (!Array.isArray(blockTrace)) return
    let { hash } = this
    let key = blockTrace.findIndex(v => Array.isArray(v) && v[0].transactionHash === hash)
    return blockTrace[key]
  }
  async fetch () {
    try {
      let tx = await this.getTx()
      await this.setToAddress(tx)
      tx = this.txFormat(tx)
      let data = { tx }
      data.events = await this.parseEvents(tx)
      if (this.trace) {
        let trace = await this.trace.fetch()
        let { internalTxs, addresses } = await this.trace.getInternalTransactionsData(trace)
        addresses.forEach(address => this.addresses.add(address))
        data.internalTxs = internalTxs
        data.trace = trace
      }
      this.data = data
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async setToAddress ({ to }) {
    this.toAddress = to
    if (this.isAddress(to)) {
      this.toAddress = this.addresses.add(to)
      await this.toAddress.fetch()
    }
  }

  async getTx () {
    try {
      let txHash = this.hash
      let tx = this.txData
      if (!this.isTxData(tx)) tx = await this.getTransactionByHash(txHash)
      if (tx.hash !== txHash) throw new Error(`Error getting tx: ${txHash}, hash received:${tx.hash}`)
      let receipt = await this.getTxReceipt(txHash)
      if (!receipt) throw new Error(`The Tx ${txHash} .receipt is: ${receipt} `)
      tx.timestamp = this.timestamp
      tx.receipt = receipt
      let { contractAddress } = receipt
      if (contractAddress) this.addresses.add(contractAddress)
      if (!tx.transactionIndex) tx.transactionIndex = receipt.transactionIndex
      return tx
    } catch (err) {
      return Promise.reject(err)
    }
  }

  getTransactionByHash (txHash) {
    return this.nod3.eth.getTransactionByHash(txHash)
  }

  getTxReceipt (txHash) {
    return this.nod3.eth.getTransactionReceipt(txHash)
  }
  async parseEvents (tx) {
    try {
      let logs = await this.parseLogs(tx.receipt.logs)
      return logs.map(l => {
        l = formatEvent(l, tx)
        let event = Object.assign({}, l)
        delete l._id
        return event
      })
    } catch (err) {
      return Promise.reject(err)
    }
  }
  txFormat (tx) {
    let type = txTypes.default
    const receipt = tx.receipt || {}
    let { toAddress } = this
    if (toAddress && toAddress.isContract()) type = txTypes.call
    const toIsNative = this.nativeContracts.isNativeContract(tx.to)
    let nativeType = txTypes[toIsNative]
    if (nativeType) type = nativeType
    if (this.isAddress(receipt.contractAddress)) type = txTypes.contract
    tx.txType = type
    tx.txId = getTxOrEventId(tx)
    return tx
  }

  parseLogs (logs) {
    const { nod3, initConfig } = this
    let parser = new ContractParser({ initConfig, nod3 })
    return new Promise((resolve, reject) => {
      process.nextTick(() => resolve(parser.parseTxLogs(logs)))
    })
  }
  isTxData (data) {
    if (!data || typeof data !== 'object') return
    return data.hash && data.blockHash && data.input
  }
}

export default Tx

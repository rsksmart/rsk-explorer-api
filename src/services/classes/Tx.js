import { BcThing } from './BcThing'
import { formatEvent } from './Event'
import ContractParser from 'rsk-contract-parser'
import { txTypes } from '../../lib/types'
import { getTxOrEventId } from '../../lib/ids'
import { isAddress } from '../../lib/utils'
import Address from './Address'
export class Tx extends BcThing {
  constructor (hash, timestamp, { txData, nod3, initConfig, collections } = {}) {
    if (!hash || !timestamp) throw new Error(`Tx, missing arguments`)
    super({ nod3, initConfig, collections })
    this.hash = hash
    this.timestamp = timestamp
    this.txData = txData
    this.toAddress = undefined
  }
  async fetch () {
    try {
      let tx = await this.getTx()
      await this.setToAddress(tx)
      tx = this.txFormat(tx)
      let events = await this.parseEvents(tx)
      let addresses = [this.toAddress]
      this.data = { tx, events, addresses }
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async setToAddress ({ to }) {
    if (!isAddress(to)) return
    this.toAddress = this.newAddress(to)
    await this.toAddress.fetch()
  }
  newAddress (address) {
    let { nod3, initConfig, collections } = this
    return new Address(address, { nod3, initConfig, collections })
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
    if (isAddress(receipt.contractAddress)) type = txTypes.contract
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

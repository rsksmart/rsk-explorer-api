import { BcThing } from './BcThing'
import txFormat from '../../lib/txFormat'
import ContractParser from '../../lib/ContractParser/ContractParser'

export class Tx extends BcThing {
  constructor (hash, timestamp, { nod3 }) {
    if (!hash || !timestamp) throw new Error(`Tx, missing arguments`)
    super(nod3)
    this.hash = hash
    this.timestamp = timestamp
    this.contractParser = new ContractParser()
  }
  async fetch () {
    try {
      let tx = await this.getTx()
      let events = await this.parseEvents(tx)
      this.data = { tx, events }
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getTx () {
    try {
      let txHash = this.hash
      let tx = await this.getTransactionByHash(txHash)
      if (tx.hash !== txHash) throw new Error(`Error getting tx: ${txHash}, hash received:${tx.hash}`)
      let receipt = await this.getTxReceipt(txHash)
      if (!receipt) throw new Error(`The Tx ${txHash} .receipt is: ${receipt} `)
      tx.timestamp = this.timestamp
      tx.receipt = receipt
      if (!tx.transactionIndex) tx.transactionIndex = receipt.transactionIndex
      tx = txFormat(tx)
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
    const timestamp = tx.timestamp
    try {
      let topics = await this.parseLogs(tx.receipt.logs)
      return topics.map(event => {
        let eventId = `${event.transactionHash}-${event.logIndex}`
        event.eventId = eventId
        event.timestamp = timestamp
        event.txStatus = tx.receipt.status
        event.event = event.event || null
        return event
      })
    } catch (err) {
      return Promise.reject(err)
    }
  }

  parseLogs (logs) {
    let parser = this.contractParser
    return new Promise((resolve, reject) => {
      process.nextTick(() => resolve(parser.parseTxLogs(logs)))
    })
  }
}

export default Tx

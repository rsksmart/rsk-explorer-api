import { BcThing } from './BcThing'
import Tx from './Tx'
import BlockAddresses from './BlockAddresses'
import { getSummaryId } from '../../lib/ids'
import { arrayDifference } from '../../lib/utils'

export const BlocksSummaryCollection = 'BlocksSummary'

export class BlockSummary extends BcThing {
  constructor (hashOrNumber, { nod3, collections, log, initConfig }) {
    super({ nod3, collections, initConfig })
    this.log = log || console
    this.hashOrNumber = hashOrNumber
    this.collection = (collections) ? collections[BlocksSummaryCollection] : undefined
    this.data = {
      block: null,
      transactions: [],
      internalTransactions: [],
      addresses: [],
      tokenAddresses: [],
      events: []
    }
  }
  async fetch (forceFetch) {
    try {
      let { fetched, hashOrNumber, nod3, initConfig, collections } = this
      if (fetched && !forceFetch) {
        return this.getData()
      }
      let blockData = await this.getBlock(hashOrNumber, true)
      const { transactions: txs, timestamp, miner, hash } = blockData
      blockData.transactions = txs.map(tx => tx.hash)
      this.data.block = blockData
      let Addresses = new BlockAddresses(blockData, { nod3, initConfig, collections })
      Addresses.add(miner)
      let blockTrace = await nod3.trace.block(hash)
      let Txs = txs.map(txData => new Tx(txData.hash, timestamp, { blockTrace, addresses: Addresses, txData, nod3, initConfig, collections }))
      let txsData = await this.fetchItems(Txs)
      let transactions = txsData.map(d => d.tx)
      let events = [].concat(...txsData.map(d => d.events))
      let internalTransactions = [].concat(...txsData.map(d => d.internalTransactions))
      let tokenAddresses = [].concat(...txsData.map(d => d.tokenAddresses))
      let addresses = await Addresses.fetch()
      this.setData({ transactions, internalTransactions, events, addresses, tokenAddresses })
      this.checkTransactions()
      this.fetched = true
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getBlock (hashOrNumber, txArr = false) {
    try {
      let { nod3 } = this
      let blockData = await nod3.eth.getBlock(hashOrNumber, txArr)
      if (blockData) blockData._received = Date.now()
      return blockData
    } catch (err) {
      return Promise.reject(err)
    }
  }

  checkTransactions () {
    let { block, transactions } = this.getData()
    let txsErr = mismatchBlockTransactions(block, transactions)
    if (txsErr.length) {
      this.log.trace(`Block: ${block.number} - ${block.hash} Missing transactions: ${JSON.stringify(txsErr)} `)
      throw new Error(`Block: ${block.number} - ${block.hash} Missing transactions `)
    }
  }

  fetchItems (items) {
    return Promise.all(Object.values(items).map(i => i.fetch()))
  }
  async save () {
    try {
      let data = await this.fetch()
      let res = await saveBlockSummary(data, this.collections)
      return res
    } catch (err) {
      this.log.error(`Error saving block summary`)
      this.log.debug(err)
      return Promise.resolve()
    }
  }
}

export const mismatchBlockTransactions = (block, transactions) => {
  let diff = arrayDifference(block.transactions, transactions.map(tx => tx.hash))
  if (diff.length) return diff
  let blockHash = block.hash
  return transactions.filter(tx => tx.blockHash !== blockHash || tx.receipt.blockHash !== blockHash)
}

export function saveBlockSummary (data, collections) {
  const collection = collections[BlocksSummaryCollection]
  const { hash, number, timestamp } = data.block
  const _id = getSummaryId(data.block)
  const summary = { _id, hash, number, timestamp, data }
  return collection.updateOne({ _id }, { $set: summary }, { upsert: true })
}

export default BlockSummary

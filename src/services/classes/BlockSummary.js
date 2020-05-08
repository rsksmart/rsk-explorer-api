import { BcThing } from './BcThing'
import Tx from './Tx'
import BlockAddresses from './BlockAddresses'
import { getSummaryId } from '../../lib/ids'
import { arrayDifference } from '../../lib/utils'

export const BlocksSummaryCollection = 'BlocksSummary'

export class BlockSummary extends BcThing {
  constructor (hashOrNumber, { nod3, collections, log, initConfig }) {
    super({ nod3, collections, initConfig, log })
    this.hashOrNumber = hashOrNumber
    this.collection = (collections) ? collections[BlocksSummaryCollection] : undefined
    this.Addresses = undefined
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
      let blockData = await getBlock(hashOrNumber, true, nod3)
      const { transactions: txs, timestamp, miner, hash } = blockData
      blockData.transactions = txs.map(tx => tx.hash)
      this.data.block = blockData
      let Addresses = new BlockAddresses(blockData, { nod3, initConfig, collections })
      Addresses.add(miner, { block: blockData })
      let blockTrace = await nod3.trace.block(hash)
      let Txs = txs.map(txData => this.newTx(txData.hash, timestamp, { blockTrace, blockData, addresses: Addresses, txData, nod3, initConfig, collections }))
      let txsData = await this.fetchItems(Txs)
      let transactions = txsData.map(d => d.tx)
      let events = [].concat(...txsData.map(d => d.events))
      let internalTransactions = [].concat(...txsData.map(d => d.internalTransactions))
      let tokenAddresses = [].concat(...txsData.map(d => d.tokenAddresses))
      let addresses = await Addresses.fetch()
      this.setData({ transactions, internalTransactions, events, addresses, tokenAddresses })
      this.checkTransactions()
      this.Addresses = Addresses
      this.fetched = true
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  newTx (hash, timestamp, options) {
    return new Tx(hash, timestamp, options)
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
  getAddresses () {
    return this.Addresses
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

export async function saveBlockSummary (data, collections) {
  const { hash, number, timestamp } = data.block
  try {
    const collection = collections[BlocksSummaryCollection]
    const _id = getSummaryId(data.block)
    const summary = { _id, hash, number, timestamp, data }
    let result = await collection.updateOne({ _id }, { $set: summary }, { upsert: true })
    return result
  } catch (err) {
    this.log.error(`Error saving Block Summary ${hash}`)
    return Promise.reject(err)
  }
}

export async function getBlock (hashOrNumber, txArr = false, nod3) {
  try {
    let blockData = await nod3.eth.getBlock(hashOrNumber, txArr)
    if (blockData) blockData._received = Date.now()
    return blockData
  } catch (err) {
    return Promise.reject(err)
  }
}

export default BlockSummary

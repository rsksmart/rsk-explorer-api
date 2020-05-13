import { BcThing } from './BcThing'
import Tx from './Tx'
import BlockAddresses from './BlockAddresses'
import { getSummaryId } from '../../lib/ids'
import { arrayDifference, isBlockHash } from '../../lib/utils'

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
  async fetch (forceFetch, skipDb) {
    try {
      let { fetched, nod3, initConfig, collections } = this
      if (fetched && !forceFetch) {
        return this.getData()
      }
      let blockData = await this.getBlockData()
      const { transactions: txs, timestamp, hash } = blockData
      if (!skipDb && collections) {
        let dbData = await getBlockSummaryFromDb(hash, collections)
        if (dbData && dbData.data) {
          this.setData(dbData.data)
          this.fetched = true
          return this.getData()
        }
      }
      let Addresses = await this.getAddresses()
      let blockTrace = await nod3.trace.block(hash)
      let Txs = txs.map(hash => this.newTx(hash, timestamp, { blockTrace, blockData, addresses: Addresses, nod3, initConfig, collections }))
      let txsData = await this.fetchItems(Txs)
      let transactions = txsData.map(d => d.tx)
      this.setData({ transactions })
      this.checkTransactions()
      let events = [].concat(...txsData.map(d => d.events))
      let internalTransactions = [].concat(...txsData.map(d => d.internalTransactions))
      let tokenAddresses = [].concat(...txsData.map(d => d.tokenAddresses))
      let addresses = await Addresses.fetch()
      this.setData({ internalTransactions, events, addresses, tokenAddresses })
      this.fetched = true
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }
  async getBlockData () {
    try {
      let { block } = this.getData()
      if (block) return block
      let { nod3, hashOrNumber } = this
      block = await getBlock(hashOrNumber, false, nod3)
      if (block) {
        this.setData({ block })
        return block
      }
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
  async getAddresses () {
    try {
      let { Addresses, nod3, initConfig, collections } = this
      if (!Addresses) {
        let blockData = await this.getBlockData()
        Addresses = new BlockAddresses(blockData, { nod3, initConfig, collections })
        let { miner } = blockData
        Addresses.add(miner, { block: blockData })
        this.Addresses = Addresses
      }
      return this.Addresses
    } catch (err) {
      return Promise.reject(err)
    }
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
    const old = await collection.findOne({ hash }, { _id: 1 })
    const _id = (old) ? old._id : getSummaryId(data.block)
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

export async function getBlockSummaryFromDb (hash, collections) {
  try {
    const collection = collections[BlocksSummaryCollection]
    if (!isBlockHash(hash)) throw new Error(`Invalid blockHash ${hash}`)
    let data = await collection.findOne({ hash })
    return data
  } catch (err) {
    return Promise.reject(err)
  }
}

export default BlockSummary

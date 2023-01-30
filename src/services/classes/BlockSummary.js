import { BcThing } from './BcThing'
import Tx from './Tx'
import BlockTrace from './BlockTrace'
import { BlockAddresses } from './BlockAddresses'
import { getSummaryId } from '../../lib/ids'
import { arrayDifference, isBlockHash } from '../../lib/utils'
import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import { summaryRepository } from '../../repositories/summary.repository'

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
      let { fetched, collections } = this
      if (fetched && !forceFetch) {
        return this.getData()
      }
      let blockData = await this.getBlockData()
      const { hash } = blockData
      if (!skipDb && collections) {
        let dbData = await getBlockSummaryFromDb(hash, collections)
        if (dbData && dbData.data) {
          this.setData(dbData.data)
          this.fetched = true
          return this.getData()
        }
      }
      let Addresses = await this.getAddresses()
      let Txs = await this.createTxs(blockData, Addresses)
      let txsData = await this.fetchItems(Txs)
      let transactions = txsData.map(d => d.tx)
      this.setData({ transactions })
      this.checkTransactions()
      let events = [].concat(...txsData.map(d => d.events))
      let internalTransactions = [].concat(...txsData.map(d => d.internalTransactions))
      let tokenAddresses = [].concat(...txsData.map(d => d.tokenAddresses))
      let suicides = [].concat(...txsData.map(d => d.suicides))
      let addresses = await Addresses.fetch()
      this.setData({ internalTransactions, events, addresses, tokenAddresses, suicides })
      this.fetched = true
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }
  async createTxs (blockData, addresses) {
    try {
      let { nod3, initConfig, collections, log } = this
      let { timestamp, transactions, hash } = blockData
      let bTrace = new BlockTrace(hash, { nod3, collections, log, initConfig })
      let blockTrace = await bTrace.fetch()
      let txs = await nod3.batchRequest(transactions.map(hash => ['eth.getTransactionByHash', hash]))
      let receipts = await nod3.batchRequest(transactions.map(hash => ['eth.getTransactionReceipt', hash]))
      return transactions.map(hash => {
        let txData = txs.find(tx => tx.hash === hash)
        let receipt = receipts.find(re => re.transactionHash === hash)
        return new Tx(hash, timestamp, { txData, receipt, blockTrace, blockData, addresses, nod3, initConfig, collections })
      })
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
        let options = { block: blockData }
        Addresses.add(miner, options)
        let summariesAddresses = await this.getSummariesAddresses()
        for (let address of summariesAddresses) {
          if (isAddress(address)) Addresses.add(address, options)
        }
        this.Addresses = Addresses
      }
      return Addresses
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getSummariesAddresses () {
    try {
      const { collections } = this
      const { number } = await this.getBlockData()
      const summaries = await getBlockSummariesByNumber(number, collections)
      const addresses = [...new Set([].concat(...summaries.map(({ addresses }) => addresses)))]
      return addresses
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async save () {
    try {
      let data = await this.fetch()
      let { log, collections } = this
      let res = await saveBlockSummary(data, collections, log)
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

export async function saveBlockSummary (data, collections, log) {
  log = log || console
  const { hash, number, timestamp } = data.block
  try {
    const collection = collections[BlocksSummaryCollection]
    const old = await summaryRepository.findOne({ hash }, { _id: 1 }, collection)
    const _id = (old) ? old._id : getSummaryId(data.block)
    const summary = { _id, hash, number, timestamp, data }
    let result = await summaryRepository.updateOne({ _id }, { $set: summary }, { upsert: true }, collection)
    return result
  } catch (err) {
    log.error(`Error saving Block Summary ${hash}`)
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
    let data = await summaryRepository.findOne({ hash }, {}, collection)
    return data
  } catch (err) {
    return Promise.reject(err)
  }
}

export async function deleteBlockSummaryFromDb (hash, collections) {
  try {
    const collection = collections[BlocksSummaryCollection]
    if (!isBlockHash(hash)) throw new Error(`Invalid blockHash ${hash}`)
    let res = summaryRepository.deleteOne({ hash }, collection)
    return res
  } catch (err) {
    return Promise.reject(err)
  }
}

export async function getBlockSummariesByNumber (blockNumber, collections) {
  try {
    const number = parseInt(blockNumber)
    if (isNaN(number)) throw new Error(`Invalid blockNumber ${blockNumber}`)
    const collection = collections[BlocksSummaryCollection]
    let res = await summaryRepository.find({ number }, {}, collection)
    return res
  } catch (err) {
    return Promise.reject(err)
  }
}

export default BlockSummary

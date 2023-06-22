import { BcThing } from './BcThing'
import Tx from './Tx'
import BlockTrace from './BlockTrace'
import { BlockAddresses } from './BlockAddresses'
import { isBlockHash } from '../../lib/utils'
import { isAddress } from '@rsksmart/rsk-utils/dist/addresses'
import { summaryRepository } from '../../repositories/summary.repository'

export class BlockSummary extends BcThing {
  constructor (hashOrNumber, { nod3, log, initConfig }) {
    super({ nod3, initConfig, log })
    this.hashOrNumber = hashOrNumber
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
      let { fetched } = this
      if (fetched && !forceFetch) {
        return this.getData()
      }
      let blockData = await this.getBlockData()
      const { hash } = blockData
      if (!skipDb) {
        let dbData = await getBlockSummaryFromDb(hash)
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
      let { nod3, initConfig, log } = this
      let { timestamp, transactions, hash } = blockData
      let blockTrace = new BlockTrace(hash, { nod3, log, initConfig })
      blockTrace = await blockTrace.fetchFromNode()

      let txs = []
      let receipts = []

      const txsChunks = []
      for (let i = 0; i <= transactions.length; i += 100) {
        txsChunks.push(transactions.slice(i, i + 100))
      }

      for (const txChunk of txsChunks) {
        txs.push(...(await nod3.batchRequest(txChunk.map(hash => ['eth.getTransactionByHash', hash]))))
        receipts.push(...(await nod3.batchRequest(txChunk.map(hash => ['eth.getTransactionReceipt', hash]))))
      }

      return transactions.map(hash => {
        let txData = txs.find(tx => tx.hash === hash)
        let receipt = receipts.find(re => re.transactionHash === hash)
        return new Tx(hash, timestamp, { txData, receipt, blockTrace, blockData, addresses, nod3, initConfig })
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

  fetchItems (items) {
    return Promise.all(Object.values(items).map(i => i.fetch()))
  }
  async getAddresses () {
    try {
      let { Addresses, nod3, initConfig } = this
      if (!Addresses) {
        let blockData = await this.getBlockData()
        Addresses = new BlockAddresses(blockData, { nod3, initConfig })
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
      const { number } = await this.getBlockData()
      const summaries = await getBlockSummariesByNumber(number)
      const addresses = [...new Set([].concat(...summaries.map(({ addresses }) => addresses)))]
      return addresses
    } catch (err) {
      return Promise.reject(err)
    }
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

export async function getBlockSummaryFromDb (hash) {
  try {
    if (!isBlockHash(hash)) throw new Error(`Invalid blockHash ${hash}`)
    let data = await summaryRepository.findOne({ hash }, {})
    return data
  } catch (err) {
    return Promise.reject(err)
  }
}

export async function deleteBlockSummaryFromDb (hash) {
  try {
    if (!isBlockHash(hash)) throw new Error(`Invalid blockHash ${hash}`)
    let res = summaryRepository.deleteOne({ hash })
    return res
  } catch (err) {
    return Promise.reject(err)
  }
}

export async function getBlockSummariesByNumber (blockNumber) {
  try {
    const number = parseInt(blockNumber)
    if (isNaN(number)) throw new Error(`Invalid blockNumber ${blockNumber}`)
    let res = await summaryRepository.find({ number }, {})
    return res
  } catch (err) {
    return Promise.reject(err)
  }
}

export default BlockSummary

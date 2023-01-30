import { BcThing } from './BcThing'
import BlockSummary from './BlockSummary'
import { blockQuery, isBlockHash, isBlockObject } from '../../lib/utils'
import { saveAddressToDb } from './Address'
import { blockRepository } from '../../repositories/block.repository'
import { txRepository } from '../../repositories/tx.repository'
import { internalTxRepository } from '../../repositories/internalTx.repository'
import { eventRepository } from '../../repositories/event.repository'
import { tokenRepository } from '../../repositories/token.repository'
import { txPendingRepository } from '../../repositories/txPending.repository'
import { addressRepository } from '../../repositories/address.repository'
import { balancesRepository } from '../../repositories/balances.repository'

export class Block extends BcThing {
  constructor (hashOrNumber, { nod3, collections, log, initConfig }) {
    super({ nod3, collections, initConfig, log })
    this.Blocks = this.collections.Blocks
    this.fetched = false
    this.log = log || console
    this.hashOrNumber = hashOrNumber
    this.summary = new BlockSummary(hashOrNumber, { nod3, initConfig, collections, log })
    this.data = {
      block: null
    }
  }

  async fetch (forceFetch) {
    try {
      if (this.fetched && !forceFetch) {
        return this.getData()
      }
      let { summary } = this
      let data = await summary.fetch()
      this.setData(data)
      this.fetched = true
      return this.getData()
    } catch (err) {
      this.log.debug('Block fetch error', err)
      return Promise.reject(err)
    }
  }

  async save (overwrite) {
    let result = {}
    try {
      let { collections, summary, hashOrNumber } = this
      // Skip saved blocks
      if (isBlockHash(hashOrNumber) && !overwrite) {
        let hash = hashOrNumber
        let exists = await blockRepository.findOne({ hash }, {}, collections.Blocks)
        if (exists) throw new Error(`Block ${hash} skipped`)
      }
      await this.fetch()
      let data = this.getData(true)
      if (!data) throw new Error(`Fetch returns empty data for block #${this.hashOrNumber}`)

      // save block summary
      await summary.save()

      let { block, transactions, internalTransactions, events, tokenAddresses, addresses } = data
      // clean db
      block = await this.removeOldBlockData(block, transactions)

      // insert block
      result.block = await this.insertBlock(block)

      // insert txs
      await Promise.all([...transactions.map(tx => txRepository.insertOne(tx, collections.Txs))])
        .then(res => { result.txs = res })

      // remove pending txs
      await Promise.all([...transactions.map(tx => txPendingRepository.deleteOne({ hash: tx.hash }, collections.PendingTxs))])

      // insert internal transactions
      await Promise.all([...internalTransactions.map(itx => internalTxRepository.insertOne(itx, collections.InternalTransactions))])
        .then(res => { result.internalTxs = res })

      // insert addresses
      result.addresses = await Promise.all([...addresses.map(a => saveAddressToDb(a, collections.Addrs))])

      // insert events
      result.events = await this.insertEvents(events)

      // insert tokenAddresses
      result.tokenAddresses = await this.insertTokenAddresses(tokenAddresses)

      return { result, data }
    } catch (err) {
      // remove blockData if block was inserted
      if (result.block) {
        let data = this.getData()
        await this.deleteBlockDataFromDb(data.block.hash, data.block.number)
      }
      this.log.trace(`Block save error [${this.hashOrNumber}]`, err)
      return Promise.reject(err)
    }
  }
  async insertEvents (events) {
    try {
      let { Events } = this.collections
      let result = await Promise.all([...events.map(e => eventRepository.updateOne(
        { eventId: e.eventId },
        { $set: e },
        { upsert: true },
        Events))])
      return result
    } catch (err) {
      this.log.error('Error inserting events')
      this.log.trace(`Events: ${JSON.stringify(events, null, 2)}`)
      return Promise.reject(err)
    }
  }
  async insertTokenAddresses (data) {
    try {
      let { TokensAddrs } = this.collections
      let result = await Promise.all([...data.map(ta => tokenRepository.updateOne(
        { address: ta.address, contract: ta.contract }, { $set: ta }, { upsert: true }, TokensAddrs))])
      return result
    } catch (err) {
      this.log.error('Error inserting token addresses')
      return Promise.reject(err)
    }
  }

  async getOldBlockData (block) {
    try {
      if (!isBlockObject(block)) throw new Error('Block data is empty')
      let exists = await this.searchBlock(block)
      if (exists.length > 1) {
        throw new Error(`ERROR block ${block.number}-${block.hash} has ${exists.length} duplicates`)
      }
      if (!exists.length) return
      let oldBlock = exists[0]
      if (oldBlock.hash === block.hash) throw new Error(`Skipped ${block.hash} because exists in db`)
      let oldBlockData = await this.getBlockFromDb(oldBlock.hash, true)
      if (!oldBlockData) throw new Error(`Missing block data for: ${block}`)
      return oldBlockData
    } catch (err) {
      this.log.debug(err.message)
      return Promise.reject(err)
    }
  }

  async removeOldBlockData (block, txs, oldBlock) {
    try {
      if (!isBlockObject(oldBlock)) oldBlock = await this.getOldBlockData(block)
      if (oldBlock) {
        let { hash, number } = oldBlock.block
        await this.deleteBlockDataFromDb(hash, number)
      }
      await this.removeBlocksByTxs(txs)
      return block
    } catch (err) {
      return Promise.reject(err)
    }
  }

  deleteBlockDataFromDb (blockHash, blockNumber) {
    return deleteBlockDataFromDb(blockHash, blockNumber, this.collections)
  }

  async removeBlocksByTxs (txs) {
    try {
      await Promise.all([...txs.map(async tx => {
        try {
          let oldTx = await this.getTransactionFromDb(tx.hash)
          if (!oldTx) return
          let oldBlock = await this.getTransactionFromDb(tx.hash)
          if (oldBlock) {
            let { blockHash, blockNumber } = oldBlock
            await this.deleteBlockDataFromDb(blockHash, blockNumber)
          }
          return
        } catch (err) {
          return Promise.reject(err)
        }
      })])
    } catch (err) {
      return Promise.reject(err)
    }
  }

  searchBlock ({ hash, number }) {
    return this.collections.Blocks.find({ $or: [{ hash }, { number }] }).toArray()
  }

  insertBlock (block) {
    return blockRepository.insertOne(block, this.collections.Blocks)
  }

  async getBlockFromDb (hashOrNumber, allData) {
    try {
      let block = await getBlockFromDb(hashOrNumber, this.collections.Blocks)
      if (block && allData) block = await this.getBlockDataFromDb(block)
      return block
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getBlockDataFromDb (block) {
    try {
      if (!block || !block.hash) throw new Error(`Invalid block: ${block}`)
      let blockHash = block.hash
      block = { block }
      await Promise.all([
        this.getBlockTransactionsFromDb(blockHash).then(txs => { block.txs = txs }),
        this.getBlockEventsFromDb(blockHash).then(events => { block.events = events })
      ])
      return block
    } catch (err) {
      return Promise.reject(err)
    }
  }

  getBlockEventsFromDb (blockHash) {
    return eventRepository.find({ blockHash }, {}, this.collections.event)
  }

  getBlockTransactionsFromDb (blockHash) {
    return eventRepository.find({ blockHash }, {}, this.collections.event)
  }

  getTransactionFromDb (hash) {
    return txRepository.findOne({ hash }, {}, this.collections.Txs)
  }

  // adds contract data to addresses
  mergeContractsAddresses () {
    let contracts = this.data.contracts
    contracts.forEach(contract => {
      let address = contract.address
      let Addr = this.addresses[address]
      if (Addr) {
        for (let prop in contract) {
          if (prop !== 'addresses') Addr.setData(prop, contract[prop])
        }
      }
    })
  }
  async fetchContractsAddresses () {
    let data = []
    for (let c in this.contracts) {
      let contract = this.contracts[c]
      let addData = await contract.fetchAddresses()
      if (addData.length) data = data.concat(addData)
    }
    return data
  }
}

export const getBlockFromDb = async (blockHashOrNumber, collection) => {
  let query = blockQuery(blockHashOrNumber)
  if (query) return blockRepository.findOne(query, {}, collection)
  return Promise.reject(new Error(`"${blockHashOrNumber}": is not block hash or number`))
}

export const deleteBlockDataFromDb = async (blockHash, blockNumber, collections) => {
  try {
    blockNumber = parseInt(blockNumber)
    if (blockNumber < 1) throw new Error(`The blockNumber: ${blockNumber} is wrong`)
    if (!isBlockHash(blockHash)) throw new Error(`Empty block hash: ${blockHash}`)
    let hash = blockHash
    let result = {}
    const query = { $or: [{ blockHash }, { blockNumber }] }

    result.block = await blockRepository.deleteMany({ $or: [{ hash }, { number: blockNumber }] }, collections.Blocks)

    let txs = await txRepository.find(query, {}, collections.Txs) || []
    let txsHashes = txs.map(tx => tx.hash)

    // remove txs
    result.txs = await txRepository.deleteMany({ hash: { $in: txsHashes } }, collections.Txs)

    // remove internal txs
    result.itxs = await internalTxRepository.deleteMany({ transactionHash: { $in: txsHashes } }, collections.InternalTransactions)

    // remove events by block
    result.events = await eventRepository.deleteMany(query, collections.Events)

    // remove events by txs
    result.eventsByTxs = await eventRepository.deleteMany({ txHash: { $in: txsHashes } }, collections.Events)

    // remove contracts by blockHash
    result.addresses = await addressRepository.deleteMany({ 'createdByTx.blockHash': blockHash }, collections.Addrs)

    // remove balances
    result.balances = await balancesRepository.deleteMany(query, collections.Balances)

    return result
  } catch (err) {
    return Promise.reject(err)
  }
}

export default Block

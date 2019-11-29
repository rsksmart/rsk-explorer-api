import { BcThing } from './BcThing'
import Tx from './Tx'
import Address from './Address'
import Contract from './Contract'
import { blockQuery, arrayDifference } from '../../lib/utils'
import { getSummaryId } from '../../lib/ids'

export class Block extends BcThing {
  constructor (hashOrNumber, { nod3, collections, log, initConfig }) {
    super({ nod3, collections, initConfig })
    this.Blocks = this.collections.Blocks
    this.fetched = false
    this.log = log || console
    this.hashOrNumber = hashOrNumber
    this.addresses = {}
    this.contracts = {}
    this.tokenAddresses = {}
    this.data = {
      block: null,
      txs: [],
      addresses: [],
      contracts: [],
      tokenAddresses: [],
      events: []
    }
  }

  async fetch (forceFetch) {
    if (this.fetched && !forceFetch) {
      return Promise.resolve(this.getData())
    }

    let connected = await this.nod3.isConnected()
    if (!connected) {
      return Promise.reject(new Error('nod3 is not connected'))
    }
    try {
      let blockData = await this.getBlock(this.hashOrNumber, true)
      const { transactions, timestamp } = blockData
      blockData.transactions = transactions.map(tx => tx.hash)
      this.data.block = blockData
      this.addAddress(blockData.miner, blockData)
      const { nod3, initConfig, collections } = this
      let txs = transactions.map(txData => new Tx(txData.hash, timestamp, { txData, nod3, initConfig, collections }))
      let txsData = await this.fetchItems(txs)
      this.data.txs = txsData.map(d => d.tx)
      this.data.txs.forEach(tx => this.addTxAddresses(tx))

      this.data.events = [].concat.apply([], txsData.map(d => d.events))

      this.data.contracts = await this.fetchItems(this.contracts)
      this.addEventsAddresses()
      this.mergeContractsAddresses()
      this.data.addresses = await this.fetchItems(this.addresses)
      this.data.tokenAddresses = await this.fetchContractsAddresses()
      this.fetched = true
      return this.getData()
    } catch (err) {
      this.log.debug('Block fetch error', err)
      return Promise.reject(err)
    }
  }

  async getBlock (number, txArr = false) {
    try {
      let blockData = await this.nod3.eth.getBlock(number, txArr)
      if (blockData) blockData._received = Date.now()
      return blockData
    } catch (err) {
      return Promise.reject(err)
    }
  }

  addTxAddresses (tx) {
    let { receipt, to, from } = tx
    this.addAddress(receipt.contractAddress)
    this.addContract(tx)
    this.addAddress(to)
    this.addAddress(from)
  }

  async save () {
    let db = this.collections
    const result = {}
    let data = await this.fetch()
    try {
      if (!data) throw new Error(`Fetch returns empty data for block #${this.hashOrNumber}`)
      data = this.serialize(data)
      let { block, txs, events, tokenAddresses } = data

      // check transactions
      let txsErr = missmatchBlockTransactions(block, txs)
      if (txsErr.length) {
        this.log.trace(`Block: ${block.number} - ${block.hash} Missing transactions: ${JSON.stringify(txsErr)} `)
        throw new Error(`Block: ${block.number} - ${block.hash} Missing transactions `)
      }

      // clean db
      block = await this.removeOldBlockData(block, txs)

      // save block summary
      await this.saveBlockSummary(data)

      // insert block
      result.block = await this.insertBlock(block)

      // insert txs
      await Promise.all([...txs.map(tx => db.Txs.insertOne(tx))])
        .then(res => { result.txs = res })

      // remove pending txs
      await Promise.all([...txs.map(tx => db.PendingTxs.deleteOne({ hash: tx.hash }))])

      // insert addresses
      await Promise.all(
        Object.values(this.addresses).map(a => {
          a.resetTxBalance() // reset to force update in next query
          return a.save()
        }))
        .then(res => { result.addresses = res })

      // insert events
      await Promise.all(
        events.map(e => db.Events.updateOne(
          { eventId: e.eventId },
          { $set: e },
          { upsert: true })))
        .then(res => { result.events = res })

      // insert tokenAddresses
      await Promise.all(
        tokenAddresses.map(ta => db.TokensAddrs.updateOne(
          { address: ta.address, contract: ta.contract }, { $set: ta }, { upsert: true })))
        .then(res => { result.tokenAddresses = res })

      return { result, data }
    } catch (err) {
      // remove blockData if block was inserted
      if (result.block) {
        this.deleteBlockDataFromDb(data.block.hash, data.block.number)
      }
      this.log.trace(`Block save error [${this.hashOrNumber}]`, err)
      return Promise.reject(err)
    }
  }

  async saveBlockSummary (data) {
    try {
      const { hash, number, timestamp } = data.block
      const collection = this.collections.BlocksSummary
      if (!hash) throw new Error(`Missing block hash`)
      const old = await collection.findOne({ hash }, { _id: 1 })
      const _id = (old) ? old._id : getSummaryId(data.block)
      const summary = { _id, hash, number, timestamp, data }
      const res = await collection.updateOne({ _id }, { $set: summary }, { upsert: true })
      return res
    } catch (err) {
      this.log.error(`Error saving block summary`)
      this.log.debug(err)
      return Promise.resolve()
    }
  }
  async getOldBlockData (block) {
    try {
      if (!block || !block.hash) throw new Error('Block data is empty')
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

  async removeOldBlockData (block, txs) {
    try {
      let oldBlock = await this.getOldBlockData(block)
      if (oldBlock) block = this.moveOldBlock(block, oldBlock)
      await this.removeBlocksByTxs(txs)
      return block
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async moveOldBlock (newBlock, oldBlockData) {
    try {
      if (!oldBlockData || !newBlock) {
        this.log.trace(`Replace block missing arguments`, oldBlockData, newBlock)
        throw new Error(`Replace block error, missing arguments`)
      }
      let { block, txs, events } = oldBlockData
      block._replacedBy = newBlock.hash
      block._events = events
      block.transactions = txs
      await this.saveOrphanBlock(block).catch(err => this.log.debug(err))
      await this.deleteBlockDataFromDb(block.hash, block.number)
      newBlock._replacedBlockHash = block.hash
      return newBlock
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

  searchBlock (block) {
    let hash = block.hash
    let number = block.number
    return this.collections.Blocks.find({ $or: [{ hash }, { number }] }).toArray()
  }

  insertBlock (block) {
    return this.collections.Blocks.insertOne(block)
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
    return this.collections.Events.find({ blockHash }).toArray()
  }

  getBlockTransactionsFromDb (blockHash) {
    return this.collections.Txs.find({ blockHash }).toArray()
  }

  getTransactionFromDb (hash) {
    return this.collections.Txs.findOne({ hash })
  }

  saveOrphanBlock (blockData) {
    delete (blockData._id)
    blockData._updated = Date.now()
    return this.collections.OrphanBlocks.updateOne({ hash: blockData.hash }, { $set: blockData }, { upsert: true })
  }

  addAddress (address, block) {
    if (!this.isAddress(address) || this.addresses[address]) return
    let { nod3, collections, initConfig } = this
    const Addr = new Address(address, { initConfig, collections, nod3, block })
    this.addresses[address] = Addr
  }

  addContract (tx) {
    let address = tx.receipt.contractAddress
    if (address) {
      let data = { tx, code: () => this.getAddressCode(address) }
      return this.getContract(address, data)
    }
  }

  getContract (address, data) {
    let contract = this.contracts[address]
    if (contract) return contract
    else return this.newContract(address, data)
  }

  newContract (address, data) {
    const { nod3, initConfig } = this
    let contract = new Contract(address, data, { nod3, initConfig })
    this.contracts[address] = contract
    return contract
  }

  getAddressCode (address) {
    return this.addresses[address].code
  }

  addEventsAddresses () {
    this.data.events.forEach(event => {
      if (event && event.args) {
        let address = event.address
        this.addAddress(address)
        let abi = event.abi
        let contract = this.getContract(address)
        if (abi && abi.inputs) {
          let eventAddresses = abi.inputs
            .filter(i => i.type === 'address')
            .map((field, i) => {
              let address = event.args[i]
              if (this.isAddress(address)) {
                return address
              }
            })
          eventAddresses.forEach(a => {
            this.addAddress(a)
            contract.addAddress(a)
          })
        }
      }
    })
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
  fetchItems (items) {
    return Promise.all(Object.values(items).map(i => i.fetch()))
  }
}

export const missmatchBlockTransactions = (block, transactions) => {
  let diff = arrayDifference(block.transactions, transactions.map(tx => tx.hash))
  if (diff.length) return diff
  let blockHash = block.hash
  return transactions.filter(tx => tx.blockHash !== blockHash || tx.receipt.blockHash !== blockHash)
}

export const getBlockFromDb = async (blockHashOrNumber, collection) => {
  let query = blockQuery(blockHashOrNumber)
  if (query) return collection.findOne(query)
  return Promise.reject(new Error(`"${blockHashOrNumber}": is not block hash or number`))
}

export const deleteBlockDataFromDb = async (blockHash, blockNumber, db) => {
  try {
    if (!blockHash) throw new Error(`Empty block hash`)
    let hash = blockHash
    let result = {}
    let query = { $or: [{ blockHash }, { blockNumber }] }

    result.block = await db.Blocks.deleteMany({ $or: [{ hash }, { number: blockNumber }] })

    let txs = await db.Txs.find(query).toArray() || []
    let txsHashes = txs.map(tx => tx.hash)

    // remove txs
    result.txs = await db.Txs.deleteMany({ hash: { $in: txsHashes } })

    // remove events by block
    result.events = await db.Events.deleteMany(query)

    // remove events by txs
    result.eventsByTxs = await db.Events.deleteMany({ txHash: { $in: txsHashes } })

    // remove contracts by blockHash
    result.addresses = await db.Addrs.deleteMany({ 'createdByTx.blockHash': blockHash })

    return result
  } catch (err) {
    return Promise.reject(err)
  }
}

export default Block

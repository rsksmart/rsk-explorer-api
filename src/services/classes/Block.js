import { BcThing } from './BcThing'
import Address from './Address'
import txFormat from '../../lib/txFormat'
import Contract from './Contract'
import ContractParser from '../../lib/ContractParser'
import { blockQuery } from '../../lib/utils'
export class Block extends BcThing {
  constructor (hashOrNumber, options) {
    super(options.web3, options.collections)
    this.Blocks = this.collections.Blocks
    this.fetched = false
    this.log = options.log || console
    this.hashOrNumber = hashOrNumber
    this.addresses = {}
    this.contracts = {}
    this.tokenAddresses = {}
    this.contractParser = new ContractParser(this.web3)
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
    if (!this.web3.isConnected()) {
      return Promise.reject(new Error('web3 is not connected'))
    }
    try {
      let blockData = await this.getBlock(this.hashOrNumber)
      this.data.block = blockData
      this.addAddress(blockData.miner)
      this.data.txs = await Promise.all(blockData.transactions
        .map((txHash, index) => this.getTx(txHash, index)))
      this.data.contracts = await this.fetchItems(this.contracts)
      this.data.events = await Promise.all(this.data.txs
        .map(tx => this.parseTxEvents(tx)))
        .then(
          events => [].concat.apply([], events)
        )
      this.addEventsAddresses()
      this.mergeContractsAddresses()
      this.data.addresses = await this.fetchItems(this.addresses)
      this.data.tokenAddresses = await this.fetchContractsAddresses()
      this.fetched = true
      return this.getData()
    } catch (err) {
      this.log.error(err)
    }
  }

  getBlock (number, txArr = false) {
    return new Promise((resolve, reject) => {
      this.web3.eth.getBlock(number, txArr, (err, blockData) => {
        if (err !== null) return reject(err)
        if (blockData) {
          blockData._received = Date.now()
          resolve(blockData)
        } else {
          return reject(new Error(`BlockData of block ${number} is empty`))
        }
      })
    })
  }

  async getTx (txHash, index, tx) {
    // if (!tx) tx = await this.getTransactionByHash(txHash)
    if (!tx) tx = await this.getTransactionByIndex(index)
    let receipt = await this.getTxReceipt(txHash)
    tx.receipt = receipt
    if (!tx.transactionIndex) tx.transactionIndex = receipt.transactionIndex
    this.addAddress(receipt.contractAddress)
    tx.timestamp = this.data.block.timestamp
    this.addContract(tx)
    this.addAddress(tx.to)
    this.addAddress(tx.from)
    tx = txFormat(tx)
    return tx
  }

  getTransactionByHash (txHash) {
    return new Promise((resolve, reject) => {
      // eth.getTransaction returns null in rskj/BAMBOO-f02dca7
      this.web3.eth.getTransaction(txHash, (err, tx) => {
        if (err !== null) return reject(err)
        else {
          if (!tx) return reject(new Error(`The Tx: ${txHash}, returns null value`))
          else resolve(tx)
        }
      })
    })
  }
  getTransactionByIndex (index) {
    return new Promise((resolve, reject) => {
      this.web3.eth.getTransactionFromBlock(this.hashOrNumber, index, (err, tx) => {
        if (err !== null) return reject(err)
        else {
          if (!tx) return reject(new Error(`The Tx: ${this.hashOrNumber}/${index}, returns null value`))
          else resolve(tx)
        }
      })
    })
  }
  getTxReceipt (txHash) {
    return new Promise((resolve, reject) => {
      this.web3.eth.getTransactionReceipt(txHash, (err, receipt) => {
        if (err !== null) return reject(err)
        resolve(receipt)
      })
    })
  }

  parseTxLogs (logs) {
    let parser = this.contractParser
    return new Promise((resolve, reject) => {
      process.nextTick(() => resolve(parser.parseTxLogs(logs)))
    })
  }

  parseTxEvents (tx) {
    const timestamp = tx.timestamp
    return this.parseTxLogs(tx.receipt.logs)
      .then(topics => topics.filter(t => t.event)
        .map(event => {
          let id = `${event.blockNumber}-${event.transactionIndex}-${event.logIndex}`
          event._id = id
          event.timestamp = timestamp
          return event
        })
      )
  }

  async save () {
    let db = this.collections
    let data = await this.fetch()
    if (!data) return Promise.reject(new Error(`Fetch returns empty data for block #${this.hashOrNumber}`))
    data = this.serialize(data)
    let block, txs, events, tokenAddresses
    ({ block, txs, events, tokenAddresses } = data)
    let result = {}
    if (!block || !block.hash) return Promise.reject(new Error('Block data is empty'))
    // const blockHash = block.hash
    try {
      let res, error
      ({ res, error } = await this.insertBlock(block))
      if (error) {
        if (error.code === 11000) {
          await this.deleteBlock(block)
        } else {
          throw error
        }
      } else {
        result.block = res
      }
      await Promise.all([...txs.map(tx => db.Txs.insertOne(tx))])
        .then(res => { result.txs = res })

      await Promise.all(
        Object.values(this.addresses).map(a => a.save()))
        .then(res => { result.addresses = res })

      await Promise.all(
        events.map(e => db.Events.insertOne(e)))
        .then(res => { result.events = res })

      await Promise.all(
        tokenAddresses.map(ta => db.TokensAddrs.updateOne(
          { address: ta.address, contract: ta.contract }, { $set: ta }, { upsert: true })))
        .then(res => { result.tokenAddresses = res })

      return { result, data }
    } catch (err) {
      return Promise.reject(err)
    }
  }

  insertBlock (block) {
    return this.collections.Blocks.insertOne(block)
      .then(res => { return { res } })
      .catch(error => { return { error } })
  }

  getDbBlock (hashOrNumber) {
    return getBlockFromDb(hashOrNumber, this.collections.Blocks)
  }
  async deleteBlock (block) {
    try {
      let blockHash = block.hash
      let hash = blockHash
      let db = this.collections
      if (!blockHash) throw Error('Invalid block hash')
      let result = await Promise.all([
        db.Blocks.deleteOne({ hash }),
        db.Txs.deleteMany({ blockHash }),
        db.Events.deleteMany({ blockHash })
      ])
      return result
    } catch (err) {
      return Promise.reject(err)
    }
  }

  addAddress (address, type) {
    if (!this.isAddress(address)) return
    const Addr = new Address(address, this.web3, this.collections.Addrs)
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
    let contract = new Contract(address, data, this.web3, this.contractParser)
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
        let fromAddress = event.args._from
        let toAddress = event.args._to
        this.addAddress(fromAddress)
        this.addAddress(toAddress)
        let contract = this.getContract(address)
        contract.addAddress(fromAddress)
        contract.addAddress(toAddress)
        // get token balances of accounts
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

export const getBlockFromDb = async (blockHashOrNumber, collection) => {
  let query = blockQuery(blockHashOrNumber)
  if (query) return collection.findOne(query)
  return Promise.reject(new Error(`"${blockHashOrNumber}": is not block hash or number`))
}

export default Block

import Address from './Address'
import txFormat from '../../lib/txFormat'
import Contract from './Contract'
import ContractParser from '../../lib/ContractParser'

/**
 * @param  {Number} Block number
 * @param  {Blocks} parent
 * @param  {Object} Options: {override:<Boolean>, forceFetch:<Boolean>}
 */
export class Block {
  constructor (number, parent, options) {
    this.parent = parent
    this.fetched = false
    this.options = options || {}
    this.web3 = parent.web3
    this.log = this.parent.log || console
    this.number = number
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
  async fetch (options) {
    options = options || this.options
    if (this.fetched && !options.forceFetch) {
      return Promise.resolve(this.getData())
    }
    let blockNumber = this.number
    if (!this.web3.isConnected()) {
      return Promise.reject(new Error('web3 is not connected'))
    }
    try {
      let override = await this.override(options)
      if (override) await this.deleteBlock(blockNumber, override)
      let blockData = await this.getBlock(blockNumber)
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

  async override (options) {
    let blockNumber = this.number
    if (typeof (blockNumber) === 'number') {
      if (options.override) return this.getDbBlock(blockNumber)
    }
    return Promise.resolve(null)
  }
  getBlock (number, txArr = false) {
    return new Promise((resolve, reject) => {
      this.web3.eth.getBlock(number, txArr, (err, blockData) => {
        if (err !== null) return reject(err)
        else {
          blockData._received = Date.now()
          resolve(blockData)
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
    this.addContract(tx)
    tx.timestamp = this.data.block.timestamp
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
      this.web3.eth.getTransactionFromBlock(this.number, index, (err, tx) => {
        if (err !== null) return reject(err)
        else {
          if (!tx) return reject(new Error(`The Tx: ${this.number}/${index}, returns null value`))
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
    let db = this.parent
    // if (this.fetched) data = this.getData()
    let data = await this.fetch()
    if (!data) return Promise.reject(new Error(`Fetch returns empty data for block #${this.number}`))
    let block, txs, addresses, events, tokenAddresses
    ({ block, txs, addresses, events, tokenAddresses } = data)
    let result = {}
    if (!block) return Promise.reject(new Error('Block data is empty'))

    await Promise.all([db.Blocks.insertOne(block), ...txs.map(tx => db.Txs.insertOne(tx))])
      .then(res => { result.blocks = res })
      .catch(err => {
        if (err.code !== 11000) return Promise.reject(new Error(`Writing block error ${err}`))
      })

    await Promise.all(
      addresses.map(a => db.Addr.updateOne({ address: a.address }, { $set: a }, { upsert: true })))
      .then(res => { result.addresses = res })
      .catch(err => Promise.reject(new Error(`Error updating Addresses ${err}`)))

    await Promise.all(
      events.map(e => db.Events.insertOne(e)))
      .then(res => { result.events = res })
      .catch(err => Promise.reject(new Error(`Error inserting Events ${err}`)))

    await Promise.all(
      tokenAddresses.map(ta => db.TokenAddr.updateOne(
        { address: ta.address, contract: ta.contract }, { $set: ta }, { upsert: true })))
      .then(res => { result.tokenAddresses = res })
      .catch(err => Promise.reject(new Error(`Error saving token Addresses ${err}`)))

    data.result = result
    return data
  }

  getDbBlock (blockNumber) {
    return this.parent.getBlockFromDb(blockNumber)
  }
  // UNCOMPLETE
  async deleteBlock (number, blockData) {
    let blockQuery = { number }
    let txQuery = { blockNumber: number }

    if (blockData) {
      let hash = blockData.hash
      blockQuery = { hash }
      txQuery = { blockHash: hash }
    }
    let db = this.parent
    let [txs, block] = await Promise.all([
      db.Txs.remove(txQuery),
      db.Blocks.remove(blockQuery)])
      .catch(err => {
        return Promise.reject(err)
      })
    if (txs.result.ok && block.result.ok) {
      this.log.info(`Delete block ${number}  
          ${block.result.n} blocks removed, ${txs.result.n} transactions removed`)
      return Promise.resolve({ block: block.result, txs: txs.result })
    }
  }
  addAddress (address, type) {
    if (address) {
      this.addresses[address] = new Address(address, this.web3, this.parent.Addr)
    }
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
      let Address = this.addresses[address]
      if (Address) {
        for (let prop in contract) {
          if (prop !== 'addresses') Address.setData(prop, contract[prop])
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
  getData () {
    return this.data
  }
}

export default Block

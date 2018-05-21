import Web3 from 'web3'
import web3Connect from '../../lib/web3Connect'
import * as dataBase from '../../lib/Db'
import txFormat from '../../lib/txFormat'
import blocksCollections from './collections'


export function Blocks (config, db) {
  let queue = []
  let log = config.Logger || console
  for (let c in blocksCollections) {
    let name = config[c] || c
    queue.push(dataBase.createCollection(db, name, blocksCollections[c]))
  }
  return Promise.all(queue).then((collections) => {
    return new SaveBlocks(config, ...collections)
  }).catch((err) => {
    log.error('Error creating collections')
    log.error(err)
    process.exit(9)
  })
}
export class SaveBlocks {
  constructor(options, blocksCollection, txCollection, addrCollection, statusCollection) {
    this.node = options.node
    this.port = options.port
    this.Blocks = blocksCollection
    this.Txs = txCollection
    this.Status = statusCollection
    this.Addr = addrCollection
    this.web3 = web3Connect(options.node, options.port)
    this.requestingBlocks = new Proxy({}, {
      set: (obj, prop, val) => {
        if (prop !== 'latest') obj[prop] = val
        return true
      }
    })
    this.blocksQueueSize = options.blocksQueueSize || 30 // max blocks per queue
    this.blocksQueue = null
    this.log = options.Logger || console
    this.state = {}
  }

  getSavedState () {
    return this.Status.find({},
      {
        sort: { timestamp: -1 },
        limit: 1,
        projection: { _id: 0 }
      })
      .toArray().then(savedStatus => {
        return this.updateState(savedStatus[0])
      })
  }

  async start () {
    let state = await this.getSavedState()
    this.state = state
    if (this.web3.isConnected()) {
      // node is syncing
      this.web3.eth.isSyncing((err, sync) => {
        this.log.debug('Node isSyncing')
        if (!err) {
          this.updateState({ sync }).then(() => {
            if (sync === true) {
              this.web3.reset(true)
              this.checkDB()
            } else if (sync) {
              let block = sync.currentBlock
              this.getBlocksFrom(block)
            } else {
              this.checkAndListen()
            }
          })
        } else {
          this.log.error('syncing error', err)
        }
      })

      if (!this.web3.eth.syncing) this.checkAndListen()
    } else {
      this.log.warn('Web3 is not connected!')
      this.updateState().then(() => {
        this.start()
        // process.exit(33)
      })
    }
  }

  checkDB () {
    this.log.info('checkig db')
    return this.getBlockAndSave('latest').then((blockData) => {
      return this.getMissingBlocks()
    }).catch((err) => {
      this.log.error('Error getting latest block: ' + err)
    })
  }

  isDbOutdated () {
    return this.dbBlocksStatus().then((res) => {
      this.log.debug(`The DB is outdated: ${JSON.stringify(res)}`)
      return this.updateState(res).then(() => {
        return (res.lastBlock > res.blocks) ? res.lastBlock : null
      })
    })
  }
  async dbBlocksStatus () {
    let lastBlock = await this.getHighDbBlock()
    lastBlock = lastBlock.number
    let blocks = await this.countDbBlocks()
    return { blocks, lastBlock }
  }

  getMissingBlocks () {
    return this.isDbOutdated().then((checkFromBlock) => {
      this.blocksQueue = checkFromBlock
      return this.processBlocksQueue()
    })
  }
  processBlocksQueue () {
    return new Promise((resolve, reject) => {
      let pending = this.makeBlockQueue()
      if (pending) {
        Promise.all(pending).then((values) => {
          // review
          this.processBlocksQueue()
        }, (reason) => {
          this.log.error(reason)
          reject(reason)
        })
      } else {
        resolve()
      }
    })
  }
  resetBlockQueue () {
    this.blocksQueue = -1
  }
  makeBlockQueue () {
    if (this.blocksQueue > -1) {
      let pending = []
      for (let i = 0; i < this.blocksQueueSize; i++) {
        pending.push(this.getBlockIfNotExistsInDb(this.blocksQueue))
        this.blocksQueue--
      }
      return pending
    }
  }

  updateState (newState) {
    let connected = this.web3.isConnected()
    newState = newState || {}
    newState.nodeDown = !connected
    newState.requestingBlocks = Object.keys(this.requestingBlocks).length
    // if (connected && undefined === newState.sync) newState.sync = this.web3.eth.syncing

    this.log.debug(`newState: ${JSON.stringify(newState)}`)
    let state = Object.assign({}, this.state)
    let changed = Object.keys(newState).find(k => newState[k] !== state[k])
    // let changed = JSON.stringify(newState) === JSON.stringify(state)
    this.state = Object.assign(state, newState)
    if (changed) {
      newState.timestamp = Date.now()
      return this.Status.insertOne(newState)
        .then(res => {
          return newState
        })
        .catch((err) => {
          this.log.error(err)
        })
    }
    else {
      return Promise.resolve(this.state)
    }
  }

  listenBlocks () {
    this.log.info('Listen to blocks...')
    this.web3.reset(true)
    let filter = this.web3.eth.filter({ fromBlock: 'latest', toBlock: 'latest' })
    filter.watch((error, log) => {
      if (error) {
        this.log.error('Filter Watch Error: ' + error)
      } else if (log === null) {
        this.log.warn('Warning: null block hash')
      } else {
        let blockNumber = log.blockNumber || null
        if (blockNumber) {
          this.log.info('New Block:', blockNumber)
          this.getBlocksFrom(blockNumber)
        } else {
          this.log.warn('Error, log.blockNumber is empty')
        }
      }
    })
  }
  getDbBlock (blockNumber) {
    return this.Blocks.findOne({ number: blockNumber }).then((doc => {
      return doc
    }))
  }
  getBlockIfNotExistsInDb (blockNumber) {
    return this.getDbBlock(blockNumber).then((block) => {
      if (!block) {
        this.log.debug('Missing block ' + blockNumber)
        return this.getBlockAndSave(blockNumber)
      }
    })
  }
  getHighDbBlock () {
    return this.Blocks.findOne({}, { sort: { number: -1 } })
  }
  countDbBlocks () {
    return this.Blocks.count({})
  }
  getBlockAndSave (blockNumber) {
    return new Promise((resolve, reject) => {
      if (!blockNumber && blockNumber !== 0) reject('blockHashOrNumber is:' + blockNumber)

      if (this.web3.isConnected()) {
        if (!this.requestingBlocks[blockNumber]) {
          this.log.debug('Getting Block: ', blockNumber)
          this.requestingBlocks[blockNumber] = true
          this.updateState()
          this.web3.eth.getBlock(blockNumber, true, (err, blockData) => {
            if (err) {
              reject(
                'Warning: error on getting block with hash/number: ' +
                blockNumber +
                ': ' +
                err
              )
            } else {
              if (!blockData) {
                reject('Warning: null block data received from ' + blockNumber)
              }
              else {
                this.log.debug('New Block Data', blockData.number, blockData.timestamp)
                delete this.requestingBlocks[blockData.number]
                resolve(this.writeBlockToDB(blockData))
              }
            }
          })
        }
      } else {
        this.start()
      }
    }).catch((err) => {
      this.requestingBlocks[blockNumber] = false
      this.log.error(err)
      this.start()
    })
  }

  async deleteBlock (number) {
    let [txs, block] = await Promise.all([this.Txs.remove({ block: number }),
    this.Blocks.remove({ number })]).catch(error => {
      this.log.error(`Error deleting block: ${number} ${error}`)
    })
    if (txs.result.ok && block.result.ok) {
      this.log.debug(`Delete block ${number}  
      ${block.result.n} blocks removed, ${txs.result.n} transactions removed`)
      return { block: block.result, txs: txs.result }
    }
  }

  extractBlockAddresses (blockdata) {
    let addresses = {}
    addresses[blockdata.miner] = this.addressDoc(blockdata.miner)
    const transactions = blockdata.transactions || []
    for (let tx of transactions) {
      addresses[tx.form] = this.addressDoc(tx.from)
      addresses[tx.to] = this.addressDoc(tx.to)
    }
    return Object.values(addresses)
  }

  addressDoc (address) {
    return { address, balance: 0, type: 'address' }
  }

  getBlockTransactions (blockData) {
    let transactions = blockData.transactions
    if (transactions) {
      transactions = transactions.map(tx => {
        tx.timestamp = blockData.timestamp
        return txFormat(tx)
      })
    }
    return transactions
  }

  insertBlock (blockData) {
    return this.Blocks.insertOne(blockData)
  }

  insertAddress (addr) {
    const address = addr.address
    addr.type = 'address'
    return new Promise((resolve, reject) => {
      if (!address) reject('Invalid address')
      this.web3.eth.getBalance(address, 'latest', (err, balance) => {
        if (err) this.log.error(`Error getting balance of address ${address}: ${err}`)
        else addr.balance = balance
        this.log.info(`Updating address: ${address}`)
        this.log.debug(JSON.stringify(addr))
        this.web3.eth.getCode(address, 'latest', (err, code) => {
          if (err) {
            this.log.error(`Error getting code for address: ${address} ERROR: ${err}`)
          } else {
            if (parseInt(code)) {
              addr.code = code
              addr.type = 'contract'
            }
          }

          resolve(this.Addr.updateOne(
            { address: addr.address },
            { $set: addr },
            { upsert: true }
          ).then(res => res)
            .catch((err) => {
              this.log.error(err)
            }))
        })
      })
    })
  }
  writeBlockToDB (blockData) {
    return new Promise((resolve, reject) => {
      if (!blockData) reject('no blockdata')
      blockData._received = Date.now()
      let addresses = this.extractBlockAddresses(blockData)
      let transactions = this.getBlockTransactions(blockData)
      delete blockData.transactions
      blockData.txs = transactions.length

      // insert block
      this.Blocks.insertOne(blockData).then((res) => {
        this.log.info('Inserted Block ' + blockData.number)
        resolve(Promise.all([
          this.insertTxs(transactions),
          addresses.map(addr => this.insertAddress(addr))]))
      }).catch((err) => {
        // insert block error
        if (err.code === 11000) {
          this.log.debug('Skip: Duplicate key ' + blockData.number.toString())
          resolve(blockData)
        } else {
          this.log.error(
            'Error: Aborted due to error on ' +
            'block number ' +
            blockData.number.toString() +
            ': ' +
            err
          )
          process.exit(9)
        }
      })
    })
  }
  insertTxs (transactions) {
    return this.Txs.insertMany(transactions).then(res => {
      this.log.debug(dataBase.insertMsg(res, transactions, 'transactions'))
      return Promise.all(transactions.map(tx => this.getTransactionReceiptAndSave(tx.hash)))
    }).catch(err => {
      let errorMsg = `Error inserting txs ${err}`
      if (err.code === 11000) this.log.debug(errorMsg)
      else this.log.error(errorMsg)
    })
  }

  getTransactionReceiptAndSave (txHash) {
    return this.getTransactionReceipt(txHash).then(receipt => {
      let address = receipt.contract
      if (address) this.insertAddress({ address })
      return this.Txs.updateOne({ hash: txHash }, { $set: { receipt } })
        .catch(err => { this.log.error(`Errror inserting receipt of tx ${txHash} ${err}`) })
    })
  }
  getTransactionReceipt (txHash) {
    return new Promise((resolve, reject) => {
      this.web3.eth.getTransactionReceipt(txHash, (err, receipt) => {
        if (err) {
          this.log.error(`Error getting receipt from tx ${txHash}`)
          reject(err)
        } else {
          resolve(receipt)
        }
      })
    })
  }
  getBlocksFrom (blockNumber) {
    if (this.requestingBlocks[blockNumber]) blockNumber--
    this.log.debug('Getting block from ', blockNumber)
    this.getDbBlock(blockNumber).then((block) => {
      if (!block) {
        this.getBlockAndSave(blockNumber)
        blockNumber--
        this.getBlocksFrom(blockNumber)
      }
    })
  }

  checkAndListen () {
    this.resetBlockQueue()
    this.updateState().then(() => {
      this.checkDB()
      this.listenBlocks()
    })
  }
}


export default Blocks

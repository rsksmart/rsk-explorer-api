import Web3 from 'web3'
import web3Connect from '../../lib/web3Connect'
import * as dataBase from '../../lib/Db'
import txFormat from '../../lib/txFormat'

const blocksCollections = {
  blocksCollection: [
    {
      key: { number: 1 },
      unique: true
    },
    {
      key: { timestamp: 1 },
      name: 'blocksTime'
    },
    {
      key: { miner: 1 },
      name: 'blocksMiner'
    },
    {
      key: { txs: 1 },
      name: 'blocksTxs'
    },
    {
      key: { size: 1 },
      name: 'blocksSize'
    }
  ],
  txCollection: [
    {
      key: { hash: 1 },
      unique: true
    },
    {
      key: {
        blockNumber: 1,
        transactionIndex: 1
      },
      name: 'blockTrasaction'
    },
    {
      key: { blockNumber: 1 },
      name: 'blockIndex'
    },
    {
      key: { from: 1 },
      name: 'fromIndex'
    },
    {
      key: { to: 1 },
      name: 'toIndex'
    },
    {
      key: { value: 1 },
      name: 'valueIndex'
    },
    {
      key: { timestamp: 1 },
      name: 'timeIndex'
    }
  ],
  addrCollection: [
    {
      key: { address: 1 },
      unique: true
    },
    {
      key: { balance: 1 },
      name: 'balanceIndex'
    }
  ],
  statsCollection: [
    {
      key: { timestamp: 1 },
      unique: true
    }
  ]
}

function blocks (config, db) {
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
class SaveBlocks {
  constructor(options, blocksCollection, txCollection, addrCollection, statsCollection) {
    this.node = options.node
    this.port = options.port
    this.Blocks = blocksCollection
    this.Txs = txCollection
    this.Stats = statsCollection
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

  start () {
    if (this.web3 && this.web3.isConnected()) {
      // node is syncing
      this.web3.eth.isSyncing((err, sync) => {
        this.log.debug('Node isSyncing')
        if (!err) {
          this.updateState({ sync })
          if (sync === true) {
            this.web3.reset(true)
            this.checkDB()
          } else if (sync) {
            let block = sync.currentBlock
            this.getBlocksFrom(block)
          } else {
            this.checkAndListen()
          }
        } else {
          this.log.error('syncing error', err)
        }
      })

      if (!this.web3.eth.syncing) this.checkAndListen()
    } else {
      this.log.warn('Web3 is not connected!')
      this.start()
    }
  }

  checkDB () {
    this.log.info('checkig db')
    return this.getBlockAndSave('latest').then((blockData) => {
      return this.getMissingBlocks()
    }).catch((err) => {
      this.log.error('Error getting latest block: ' + err)
      process.exit()
    })
  }

  isDbOutdated () {
    return this.dbBlocksStats().then((res) => {
      console.log(res)
      this.updateState({ res })
      return (res.lastBlock > res.blocks) ? res.lastBlock : null
    })
  }
  async dbBlocksStats () {
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
    for (let p in newState) {
      this.state[p] = newState[p]
    }
    this.state.timestamp = Date.now()
    this.saveStatsToDb()
  }

  saveStatsToDb () {
    let stats = Object.assign({}, this.state)
    this.Stats.insertOne(stats).catch((err) => {
      this.log.error(err)
    })
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
    return { address, balance: 0 }
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

  insertAddresses (addresses) {
    for (let addr of addresses) {
      this.web3.eth.getBalance(addr.address, 'latest', (err, balance) => {
        if (err) this.log.error(`Error getting balance of address ${addr.address}: ${err}`)
        else addr.balance = balance
        this.log.info(`Updating address: ${addr.address}`)
        this.log.debug(JSON.stringify(addr))
        this.Addr.updateOne(
          { address: addr.address },
          { $set: addr },
          { upsert: true }
        ).catch((err) => {
          this.log.error(err)
        })
      })
    }
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

        // insert transactions
        if (transactions.length) {
          this.Txs.insertMany(transactions).then((res) => {
            this.log.debug(dataBase.insertMsg(res, transactions, 'transactions'))
            resolve(blockData)
          }).catch((err) => {
            // insert txs error
            let errorMsg = 'Error inserting txs ' + err
            if (err.code !== 11000) {
              this.log.error(errorMsg)
              reject(err)
            }
            else {
              this.log.debug(errorMsg)
              resolve(blockData)
            }
          })
        }
        this.insertAddresses(addresses)
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
    this.updateState({ sync: this.web3.eth.syncing })
    this.checkDB()
    this.listenBlocks()
  }
}


export default blocks

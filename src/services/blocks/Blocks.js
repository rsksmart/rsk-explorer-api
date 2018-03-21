import Web3 from 'web3'
import Logger from '../../lib/Logger'


class SaveBlocks {
  constructor(config, blocksCollection, txCollection, accountsCollection) {
    this.config = config
    this.Blocks = blocksCollection
    this.Txs = txCollection
    this.Accounts = accountsCollection
    this.web3 = this.web3Connect()
    this.requestingBlocks = {}
    this.blocksProcessSize = 30
    this.blocksQueue = -1
    this.log = Logger('Blocks')
  }
  web3Connect () {
    return new Web3(
      new Web3.providers.HttpProvider(
        'http://' + this.config.node + ':' + this.config.port
      )
    )
  }
  checkDB () {
    this.log.info('checkig db')
    return this.getBlockAndSave('latest').then((blockData) => {
      return this.checkDbBlocks().then((missingBlocks) => {
        this.blocksQueue = missingBlocks
        return this.processAllQueues()
      })
    }).catch((err) => {
      this.log.error('Error getting latest block')
    })
  }

  listenBlocks () {
    this.log.info('Listen to blocks...')
    this.web3.reset()
    let filter = this.web3.eth.filter({ fromBlock: 'latest', toBlock: 'latest' })
    filter.watch((error, log) => {
      if (error) {
        this.log.error('Error: ' + error)
      } else if (log === null) {
        this.log.warn('Warning: null block hash')
      } else {
        let blockNumber = log.blockNumber || null
        if (blockNumber) {
          this.log.debug('new block!', blockNumber)
          this.getBlocksFrom(blockNumber)
        } else {
          this.log.warn('Error, log.blockNumber is empty')
        }
      }
    })
  }
  processAllQueues () {
    return new Promise((resolve, reject) => {
      let pending = this.processQueue()
      if (pending) {
        Promise.all(pending).then((values) => {
          this.processAllQueues()
        }, (reason) => {
          this.log.error(reason)
          this.checkDB()
          this.listenBlocks()
        })
      } else {
        resolve()
      }
    })

  }
  processQueue () {
    if (this.blocksQueue > -1) {
      let pending = []
      for (let i = 0; i <= this.blocksProcessSize; i++) {
        pending.push(this.getBlockIfNotExistsInDb(this.blocksQueue))
        this.blocksQueue--
      }
      return pending
    }
  }

  checkDbBlocks () {
    return this.getHighDbBlock().then((lastBlock) => {
      return this.countDbBlocks().then((dbBlocks) => {
        if (lastBlock.number > dbBlocks) {
          // missing blocks in db
          return lastBlock.number
        } else {
          return null
        }
      })
    }).catch((err) => {
      this.log.error(err)
    })
  }
  checkBlock (blockNumber) {
    return this.Blocks.findOne({ number: blockNumber }).then((doc => {
      return doc
    }))
  }
  getBlockIfNotExistsInDb (blockNumber) {
    return this.checkBlock(blockNumber).then((block) => {
      if (!block) {
        this.log.debug('missing block ' + blockNumber)
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
      }
    })
  }

  extractTransactionsAccounts (transactions) {
    let accounts = []
    for (let tx of transactions) {
      accounts.push(this.accountDoc(tx.from))
      accounts.push(this.accountDoc(tx.to))
    }
    return accounts
  }
  accountDoc (address) {
    return { address, balance: 0 }
  }

  getBlockTransactions (blockData) {
    let transactions = blockData.transactions
    if (transactions) {
      transactions = transactions.map(item => {
        item.timestamp = blockData.timestamp
        return item
      })
    }
    return transactions
  }

  insertBlock (blockData) {
    return this.Blocks.insertOne(blockData)
  }

  insertAccounts (accounts) {
    for (let account of accounts) {
      this.Accounts.insertOne(account).then((res) => {
        this.log.info(this.dbInsertMsg(res, accounts, 'accounts'))
      }).catch((err) => {
        // hide duplicate accounts log 
        if (err.code !== 11000) console.log('Errror inserting account ' + err)
      })
    }
  }

  writeBlockToDB (blockData) {
    return new Promise((resolve, reject) => {
      if (!blockData) reject('no blockdata')
      let transactions = this.getBlockTransactions(blockData)
      delete blockData.transactions
      blockData.txs = transactions.length
      let accounts = this.extractTransactionsAccounts(transactions)
      // insert block
      this.Blocks.insertOne(blockData).then((res) => {
        this.log.info('Inserted Block ' + blockData.number)

        // insert transactions
        if (transactions.length) {
          this.Txs.insertMany(transactions).then((res) => {
            this.log.debug(this.dbInsertMsg(res, transactions, 'transactions'))
            resolve(blockData)
          }).catch((err) => {
            // insert txs error
            this.log.error('Error inserting txs ' + err)
          })
        }

        // insert accounts
        this.insertAccounts(accounts)


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
    this.log.debug('get block from ', blockNumber)
    this.checkBlock(blockNumber).then((block) => {
      if (!block) {
        this.getBlockAndSave(blockNumber)
        blockNumber--
        this.getBlocksFrom(blockNumber)
      }
    })
  }
  start () {
    if (this.web3.isConnected()) {
      this.checkDB()
      this.listenBlocks()
    } else {
      this.log.warn('Web3 is not connected!')
      this.start()
    }

  }
  startOLD () {
    if (this.web3.isConnected()) {
      this.web3.eth.isSyncing((err, sync) => {
        if (!err) {
          if (sync === true) {
            this.web3.reset(true)
            this.checkDB()
          } else if (sync) {
            let block = sync.currentBlock
            this.getBlocksFrom(block)
          } else {
            this.checkDB()
            this.listenBlocks()
          }
        } else {
          this.log.error('syncing error', err)
        }
      })
    } else {
      this.log.warn('Web3 is not connected!')
      this.start()
    }
  }

  dbInsertMsg (insertResult, data, dataType) {
    let count = (data) ? data.length : null
    let msg = ['Inserted', insertResult.result.n]
    if (count) {
      msg.push('of')
      msg.push(count)
    }
    if (dataType) msg.push(dataType)
    return msg.join(' ')
  }



}

export default SaveBlocks

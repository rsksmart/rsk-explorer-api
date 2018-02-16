import Web3 from 'web3'

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
  }
  web3Connect () {
    return new Web3(
      new Web3.providers.HttpProvider(
        'http://' + this.config.node + ':' + this.config.port
      )
    )
  }
  checkDB () {
    console.log('checkig db')
    return this.getBlockAndSave('latest').then((blockData) => {
      return this.checkDbBlocks().then((missingBlocks) => {
        this.blocksQueue = missingBlocks
        return this.processAllQueues()
      })
    }).catch((err) => {
      console.log('Error getting latest block')
    })
  }
 
  listenBlocks () {
    console.log('Listen to blocks...')
    this.web3.reset()
    let filter = this.web3.eth.filter({ fromBlock: 'latest', toBlock: 'latest' })
    filter.watch((error, log) => {
      if (error) {
        console.log('Error: ' + error)
      } else if (log === null) {
        console.log('Warning: null block hash')
      } else {
        let blockNumber = log.blockNumber || null
        if (blockNumber) {
          console.log('new block!', blockNumber)
          this.getBlocksFrom(blockNumber)
        } else {
          console.log('Error, log.blockNumber is empty')
        }
      }
    })
  }
  init () {
    console.log('INIT')
    this.checkDB().then((res) => {
      console.log('db checked!')
      this.listenBlocks()
    })
  }
  processAllQueues () {
    return new Promise((resolve, reject) => {
      let pending = this.processQueue()
      if (pending) {
        Promise.all(pending).then((values) => {
          this.processAllQueues()
        }, (reason) => {
          console.log(reason)
          this.init() // review
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
        pending.push(this.getBlockIfNotPresent(this.blocksQueue))
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
      console.log(err)
    })
  }
  checkBlock (blockNumber) {
    return this.Blocks.findOne({ number: blockNumber }).then((doc => {
      return doc
    }))
  }
  getBlockIfNotPresent (blockNumber) {
    return this.checkBlock(blockNumber).then((block) => {
      if (!block) {
        console.log('missing block ' + blockNumber)
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
          console.log('Getting Block: ', blockNumber)
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
                console.log('newBlockData', blockData.number, blockData.timestamp)
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
        console.log(this.dbInsertMsg(res, accounts, 'accounts'))
      }).catch((err) => {
        // hide duplicate accounts log 
        if (err.code !== 11000) console.log('Errror inserting account ' + err)
      })
    }
  }

  writeBlockToDB (blockData) {
    console.log('write to db')
    return new Promise((resolve, reject) => {
      if (!blockData) reject('no blockdata')
      let transactions = this.getBlockTransactions(blockData)
      delete blockData.transactions
      blockData.txs = transactions.length
      let accounts = this.extractTransactionsAccounts(transactions)
      // insert block
      this.Blocks.insertOne(blockData).then((res) => {
        console.log('Inserted Block ' + blockData.number)

        // insert transactions
        if (transactions.length) {
          this.Txs.insertMany(transactions).then((res) => {
            console.log(this.dbInsertMsg(res, transactions, 'transactions'))
            resolve(blockData)
          }).catch((err) => {
            // insert txs error
            console.log('Error inserting txs ' + err)
          })
        }

        // insert accounts
        this.insertAccounts(accounts)


      }).catch((err) => {
        // insert block error
        if (err.code === 11000) {
          console.log('Skip: Duplicate key ' + blockData.number.toString())
          resolve(blockData)
        } else {
          console.log(
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
    console.log('get block from ', blockNumber)
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
      console.log('Web3 is not connected!')
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
            console.log('NO SYNC')
            this.init()
          }
        } else {
          console.log('syncing error', err)
        }
      })
    } else {
      console.log('Web3 is not connected!')
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

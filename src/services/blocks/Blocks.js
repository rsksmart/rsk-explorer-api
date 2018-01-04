import Web3 from 'web3'

class SaveBlocks {
  constructor(config, blocksCollection, txCollection, accountsCollection) {
    this.config = config
    this.Blocks = blocksCollection
    this.Txs = txCollection
    this.Accounts = accountsCollection
    this.web3 = this.connect()
  }
  connect() {
    return new Web3(
      new Web3.providers.HttpProvider(
        'http://' + this.config.node + ':' + this.config.port
      )
    )
  }
  listenBlocks() {
    console.log('Listen to blocks...')
    let newBlocks = this.web3.eth.filter('latest')
    newBlocks.watch((error, log) => {
      if (error) {
        console.log('Error: ' + error)
      } else if (log === null) {
        console.log('Warning: null block hash')
      } else {
        this.grabBlock(log)
      }
    })
  }
  grabBlock(blockHashOrNumber) {
    let desiredBlockHashOrNumber

    // check if done
    if (blockHashOrNumber === undefined) {
      return
    }

    if (typeof blockHashOrNumber === 'object') {
      if ('start' in blockHashOrNumber && 'end' in blockHashOrNumber) {
        desiredBlockHashOrNumber = blockHashOrNumber.end
      } else {
        console.log(
          'Error: Aborted becasue found a interval in blocks ' +
            "array that doesn't have both a start and end."
        )
        process.exit(9)
      }
    } else {
      desiredBlockHashOrNumber = blockHashOrNumber
    }

    if (this.web3.isConnected()) {
      console.log('Getting Block: ' + desiredBlockHashOrNumber)
      this.web3.eth.getBlock(
        desiredBlockHashOrNumber,
        true,
        (error, blockData) => {
          if (error) {
            console.log(
              'Warning: error on getting block with hash/number: ' +
                desiredBlockHashOrNumber +
                ': ' +
                error
            )
          } else if (blockData === null) {
            console.log(
              'Warning: null block data received from the block with hash/number: ' +
                desiredBlockHashOrNumber
            )
          } else {
            console.log('newBlockData', blockData.number)
            if (
              'terminateAtExistingDB' in this.config &&
              this.config.terminateAtExistingDB === true
            ) {
              this.checkBlockDBExistsThenWrite(blockData)
            } else {
              this.writeBlockToDB(blockData)
            }
            if ('listenOnly' in this.config && this.config.listenOnly === true)
              return

            if ('hash' in blockData && 'number' in blockData) {
              // If currently working on an interval (typeof blockHashOrNumber === 'object') and
              // the block number or block hash just grabbed isn't equal to the start yet:
              // then grab the parent block number (<this block's number> - 1). Otherwise done
              // with this interval object (or not currently working on an interval)
              // -> so move onto the next thing in the blocks array.
              if (
                typeof blockHashOrNumber === 'object' &&
                ((typeof blockHashOrNumber['start'] === 'string' &&
                  blockData['hash'] !== blockHashOrNumber['start']) ||
                  (typeof blockHashOrNumber['start'] === 'number' &&
                    blockData['number'] > blockHashOrNumber['start']))
              ) {
                blockHashOrNumber['end'] = blockData['number'] - 1
                this.grabBlock(blockHashOrNumber)
              } else {
                this.grabBlock(config.blocks.pop())
              }
            } else {
              console.log(
                'Error: No hash or number was found for block: ' +
                  blockHashOrNumber
              )
              process.exit(9)
            }
          }
        }
      )
    } else {
      console.log(
        'Error: Aborted due to web3 is not connected when trying to ' +
          'get block ' +
          desiredBlockHashOrNumber
      )
      process.exit(9) // reviews
    }
  }
  fillAccounts(transactions) {
    let accounts = []
    for (let tx of transactions) {
      accounts.push(this.accountDoc(tx.from))
      accounts.push(this.accountDoc(tx.to))
    }
    return accounts
  }
  accountDoc(address) {
    return { address, balance: 0 }
  }
  writeBlockToDB(blockData) {
    console.log('Writing block to db')

    let transactions = blockData.transactions
    delete blockData.transactions
    blockData.txs = transactions.length
    transactions = transactions.map(item => {
      item.timestamp = blockData.timestamp
      return item
    })
    let accounts = this.fillAccounts(transactions)

    this.Blocks.insertOne(blockData, (err, res) => {
      if (!err) {
        this.Txs.insertMany(transactions, (err, res) => {
          if (!err) {
            this.Accounts.insertMany(accounts, (err, res) => {
              if (!err) {
                if (!('quiet' in this.config && this.config.quiet === true)) {
                  console.log(
                    'DB successfully written for block number ' +
                      blockData.number.toString()
                  )
                }
              } else {
                if (err.code === 11000) {
                  console.log('DUP accounts ' + err)
                } else {
                  console.log('Error: Aborted saving accounts ' + err)
                }
              }
            })
          } else {
            if (err.code === 11000) {
              console.log('DUP transactions ' + err)
            } else {
              console.log(
                'Error: Aborted saving transactions of block ' +
                  blockData.number.toString() +
                  ':' +
                  err
              )
            }
          }
        })
      } else {
        if (err.code === 11000) {
          console.log('Skip: Duplicate key ' + blockData.number.toString())
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
      }
    })
  }
  /**
   * Checks if the a record exists for the block number then ->
   *     if record exists: abort
   *     if record DNE: write a file for the block
   */
  checkBlockDBExistsThenWrite(blockData) {
    db.findOne({ number: blockData.number }).then(doc => {
      if (doc) {
        console.log(
          'Aborting because block number: ' +
            blockData.number.toString() +
            ' already exists in DB.'
        )
        process.exit(9)
      } else {
        this.writeBlockToDB(blockData)
      }
    })
  }
  grabBlocks() {
    if ('listenOnly' in this.config && this.config.listenOnly === true)
      this.listenBlocks()
    else
      setTimeout(() => {
        this.grabBlock(this.config.blocks.pop())
      }, 2000)
  }

  patchBlocks() {
    // number of blocks should equal difference in block numbers
    let firstBlock = 0
    let lastBlock = this.web3.eth.blockNumber
    this.blockIter(firstBlock, lastBlock)
  }

  blockIter(firstBlock, lastBlock) {
    // if consecutive, deal with it
    if (lastBlock < firstBlock) return
    if (lastBlock - firstBlock === 1) {
      ;[lastBlock, firstBlock].forEach(blockNumber => {
        this.Blocks.find({ number: blockNumber }, (err, b) => {
          if (!b.length) this.grabBlock(firstBlock)
        })
      })
    } else if (lastBlock === firstBlock) {
      this.Blocks.find({ number: firstBlock }, (err, b) => {
        if (!b.length) this.grabBlock(firstBlock)
      })
    } else {
      this.Blocks.count(
        { number: { $gte: firstBlock, $lte: lastBlock } },
        (err, c) => {
          let expectedBlocks = lastBlock - firstBlock + 1
          if (c === 0) {
            this.grabBlock({ start: firstBlock, end: lastBlock })
          } else if (expectedBlocks > c) {
            console.log('Missing: ' + JSON.stringify(expectedBlocks - c))
            let midBlock = firstBlock + parseInt((lastBlock - firstBlock) / 2)
            this.blockIter(firstBlock, midBlock)
            this.blockIter(midBlock + 1, lastBlock)
          } else return
        }
      )
    }
  }
}

export default SaveBlocks

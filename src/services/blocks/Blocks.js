import web3Connect from '../../lib/web3Connect'
import Block from './Block.js'
import { BlocksStatus } from './BlocksStatus'

export class SaveBlocks {
  constructor (options, collections) {
    this.node = options.node
    this.port = options.port
    this.Blocks = collections.blocksCollection
    this.Txs = collections.txCollection
    this.Addr = collections.addrCollection
    this.Events = collections.eventsCollection
    this.TokenAddr = collections.tokenAddrCollection
    this.web3 = web3Connect(options.node, options.port)
    this.requestingBlocks = new Proxy({}, {
      set (obj, prop, val) {
        if (prop !== 'latest') obj[prop] = val
        return true
      }
    })
    this.blocksQueueSize = options.blocksQueueSize || 100 // max blocks per queue
    this.blocksQueue = {}
    this.segments = []
    this.log = options.Logger || console
    this.Status = new BlocksStatus(collections.statusCollection, this)
  }

  async start () {
    if (this.web3.isConnected()) {
      Promise.all([this.requestBlock(0), this.requestBlock('latest')])
        .then(() => this.isDbOutDated().then(() => this.getBlocks()))

      // node is syncing
      this.web3.eth.isSyncing((err, sync) => {
        this.log.debug('Node is syncing')
        if (!err) {
          this.Status.update({ sync }).then(() => {
            if (sync === true) {
              this.web3.reset(true)
            } else if (sync) {
              let block = sync.currentBlock
              this.requestBlock(block)
            } else {
              this.listen()
            }
          })
        } else {
          this.log.error('Syncing error', err)
        }
      })

      if (!this.web3.eth.syncing) {
        this.listen()
      }
    } else {
      this.log.warn('Web3 is not connected!')
      this.Status.update().then(() => {
        this.start()
      })
    }
  }

  async checkDb () {
    let lastBlock = await this.getHighDbBlock()
    lastBlock = lastBlock.number

    let blocks = await this.countDbBlocks()

    let missingSegments = []
    if (blocks < lastBlock + 1) {
      missingSegments = await this.getMissingSegments()
    }
    return { lastBlock, blocks, missingSegments }
  }

  async isDbOutDated () {
    let dbS = await this.checkDb()
    if (!this.segments.length) {
      this.segments = dbS.missingSegments
    }
    return this.Status.update(dbS)
      .then(() => (dbS.lastBlock > dbS.blocks) ? dbS.lastBlock : null)
  }

  async getMissingSegments (fromBlock = 0, toBlock = null) {
    let query = (fromBlock || toBlock) ? { number: {} } : {}
    if (fromBlock > 0) query.number.$gte = fromBlock
    if (toBlock && toBlock > fromBlock) query.number.$lte = toBlock
    return this.Blocks.find(query)
      .sort({ number: -1 })
      .project({ _id: 0, number: 1 })
      .map(block => block.number)
      .toArray()
      .then(blocks => {
        if (blocks.length === 1) {
          blocks.push(-1)
          return Promise.resolve([blocks])
        }
        return this.getMissing(blocks)
      })
      .catch(err => {
        this.log.error(`Error getting missing blocks segments ${err}`)
        process.exit(9)
      })
  }

  getMissing (a) {
    if (a[a.length - 1] > 0) a.push(0)
    return a.filter((v, i) => {
      return (a[i + 1] - v < -1)
    }).map(mv => [mv, a.find((v, i) => {
      return (v < mv && a[i - 1] - v > 1)
    })])
  }

  async getBlock (blockNumber) {
    let block
    if (Number.isInteger(blockNumber)) {
      block = await this.getBlockFromDb(blockNumber)
    }
    if (block) return Promise.resolve(block)
    else return this.newBlock(blockNumber).save()
  }

  getBlocks () {
    if (this.segments.length) {
      let seg = this.segments[0]
      let size = this.blocksQueueSize
      let queue = []
      for (let i = 1; i <= size; i++) {
        let block = seg[1] + i
        if (block < seg[0]) {
          queue.push(this.requestBlock(block))
        }
      }
      Promise.all(queue).then(res => {
        if (seg[1] >= seg[0]) this.segments.splice(0, 1)
        else this.segments[0] = [seg[0], seg[1] + size]
        return this.getBlocks()
      })
    }
  }

  isRequested (number) {
    return this.requestingBlocks[number]
  }

  // shared with Block
  getBlockFromDb (blockNumber) {
    return this.Blocks.findOne({ number: blockNumber })
  }

  newBlock (blockNumber, options) {
    return new Block(blockNumber, this, options)
  }

  async dbBlocksStatus () {
    let lastBlock = await this.getHighDbBlock()
    lastBlock = lastBlock.number
    let blocks = await this.countDbBlocks()
    return { blocks, lastBlock }
  }

  async requestBlock (number) {
    if (!this.isRequested(number)) {
      this.log.debug(`Requesting block ${number}`)
      let block = await this.newBlock(number)
      this.requestingBlocks[number] = block
      return block.save()
        .then(res => {
          return this.endBlockRequest(number)
        })
        .catch(err => {
          this.log.error(err)
          return this.endBlockRequest(number)
        })
    }
  }

  endBlockRequest (number) {
    this.requestingBlocks[number] = null
    delete this.requestingBlocks[number]
    return this.Status.update()
  }

  listen () {
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
          this.log.debug('New Block:', blockNumber)
          this.requestBlock(blockNumber)
        } else {
          this.log.warn('Error, log.blockNumber is empty')
        }
      }
    })
  }
  getHighDbBlock () {
    return this.Blocks.findOne({}, { sort: { number: -1 } })
  }
  countDbBlocks () {
    return this.Blocks.countDocuments({})
  }
}

export function Blocks (db, config, blocksCollections) {
  let collections = {}
  Object.keys(blocksCollections).forEach((k, i) => {
    collections[k] = db.collection(config[k])
  })
  return new SaveBlocks(config, collections)
}

export default SaveBlocks

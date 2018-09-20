import web3Connect from '../../lib/web3Connect'
import { Block, getBlockFromDb } from '../classes/Block'
import { BlocksStatus } from '../classes/BlocksStatus'
import { RequestingBlocks } from '../classes/RequestingBlocks'

export class SaveBlocks {
  constructor (options, collections) {
    this.node = options.node
    this.port = options.port
    this.collections = collections
    this.Blocks = collections.Blocks
    this.web3 = web3Connect(options.node, options.port)
    this.requestingBlocks = RequestingBlocks
    this.blocksQueueSize = options.blocksQueueSize || 100 // max blocks per queue
    this.blocksQueue = {}
    this.segments = []
    this.log = options.Logger || console
    this.Status = new BlocksStatus(collections.Status, this)
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
              let number = sync.currentBlock
              this.requestBlock(number)
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

  async getBlock (hashOrNumber) {
    let block = await this.getBlockFromDb(hashOrNumber)
    if (block && block.hash === hashOrNumber) {
      return Promise.resolve(block)
    } else {
      return this.requestBlock(hashOrNumber)
        .then(block => {
          this.log.debug(`Getting parent of block ${block.number}`)
          return this.getBlock(block.parentHash)
        }).catch(err => {
          this.log.error(err)
          this.endBlockRequest(hashOrNumber)
        })
    }
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

  getBlockFromDb (hashOrNumber) {
    return getBlockFromDb(hashOrNumber, this.Blocks)
  }

  newBlock (hashOrNumber, options) {
    return new Block(hashOrNumber, this, options)
  }

  async dbBlocksStatus () {
    let lastBlock = await this.getHighDbBlock()
    lastBlock = lastBlock.number
    let blocks = await this.countDbBlocks()
    return { blocks, lastBlock }
  }

  async requestBlock (hashOrNumber) {
    // Review ----------------------
    if (this.requestingBlocks.isRequested(hashOrNumber)) {
      return Promise.resolve(hashOrNumber)
    }
    try {
      this.log.debug(`Requesting block ${hashOrNumber}`)
      let block = await this.newBlock(hashOrNumber)
      this.requestingBlocks.add(hashOrNumber, true)
      this.Status.update()
      let res = await block.save()
      this.endBlockRequest(hashOrNumber)
      return res.data.block
    } catch (err) {
      return Promise.reject(err)
    }
  }

  endBlockRequest (hashOrNumber) {
    this.requestingBlocks.delete(hashOrNumber)
    this.Status.update()
    return hashOrNumber
  }

  listen () {
    this.log.info('Listen to blocks...')
    this.web3.reset(true)
    let filter = this.web3.eth.filter('latest')
    filter.watch((error, blockHash) => {
      if (error) {
        this.log.error('Filter Watch Error: ' + error)
      } else if (!blockHash) {
        this.log.warn('Warning: null block hash')
      } else {
        this.log.debug('New Block:', blockHash)
        this.getBlock(blockHash)
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
    collections[k] = db.collection(config.collections[k])
  })
  return new SaveBlocks(config, collections)
}

export default SaveBlocks

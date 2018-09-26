import { BlocksBase } from '../../lib/BlocksBase'
import { getBlockFromDb } from '../classes/Block'
import { getBlock } from '../classes/RequestBlocks'
import { BlocksRequester } from './blocksRequester'

export class SaveBlocks extends BlocksBase {
  constructor (db, options) {
    super(db, options)
    this.Blocks = this.collections.Blocks
    this.Requester = BlocksRequester(db, options)
    this.tipSize = options.bcTipSize || 12
  }

  async start () {
    if (this.web3.isConnected()) {
      Promise.all([this.getBlock(0), this.getLastBlock()])
        .then(() => this.checkDb().then(res => this.getBlocks(res)))

      // node is syncing
      this.web3.eth.isSyncing((err, sync) => {
        this.log.debug('Node is syncing')
        if (!err) {
          this.updateStatus({ sync }).then(() => {
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
      this.updateStatus().then(() => {
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
      return getBlock(this.web3, this.collections, hashOrNumber, this.log)
    }
  }

  getLastBlock () {
    return new Promise((resolve, reject) => {
      this.web3.eth.getBlock('latest', (err, block) => {
        if (err) return reject(err)
        else {
          let number = block.number
          resolve(this.getBlock(number)
            .then(res => {
              let block = res.block.data.block
              return block
            }))
        }
      })
    })
  }

  getBlocks (check) {
    let segments = check.missingSegments
    if (segments) {
      segments.forEach(segment => {
        let number = segment[0]
        let limit = segment[1]
        let values = []
        while (number >= limit) {
          values.push(number)
          number--
        }
        this.bulkRequest(values)
      })
    }
  }

  getBlockFromDb (hashOrNumber) {
    return getBlockFromDb(hashOrNumber, this.Blocks)
  }

  async dbBlocksStatus () {
    let lastBlock = await this.getHighDbBlock()
    lastBlock = lastBlock.number
    let blocks = await this.countDbBlocks()
    return { blocks, lastBlock }
  }

  bulkRequest (keys) {
    return this.Requester.bulkRequest(keys)
  }

  requestBlock (hashOrNumber, prioritize) {
    this.Requester.request(hashOrNumber, prioritize)
  }

  updateStatus (state) {
    return this.Requester.updateStatus(state)
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
        this.requestBlock(blockHash, true)
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

export function Blocks (db, config) {
  return new SaveBlocks(db, config)
}

export default SaveBlocks

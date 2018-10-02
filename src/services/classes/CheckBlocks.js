import { BlocksBase } from '../../lib/BlocksBase'
import { getBlockFromDb } from './Block'
import { getBlock } from './RequestBlocks'

export class CheckBlocks extends BlocksBase {
  constructor (db, options) {
    super(db, options)
    this.Blocks = this.collections.Blocks
    this.tipBlock = null
    this.tipCount = 0
    this.tipSize = options.bcTipSize
  }

  start () {
    Promise.all([this.getBlock(0), this.getLastBlock()])
      .then(() => this.checkDb(true).then(res => this.getBlocks(res)))
  }

  async checkDb (orphans) {
    let lastBlock = await this.getHighDbBlock()
    lastBlock = lastBlock.number

    let blocks = await this.countDbBlocks()

    let missingSegments = []
    if (blocks < lastBlock + 1) {
      missingSegments = await this.getMissingSegments()
    }
    let res = { lastBlock, blocks, missingSegments }
    if (orphans) {
      let orphans = await this.getOrphans()
      res = Object.assign(res, orphans)
    }
    return res
  }

  async getOrphans (lastBlock) {
    let blocks = await checkBlocksCongruence(this.Blocks, lastBlock)
    return blocks
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
  getLastBlock () {
    return new Promise((resolve, reject) => {
      this.web3.eth.getBlock('latest', (err, block) => {
        if (err) return reject(err)
        else {
          let number = block.number
          resolve(this.getBlock(number))
        }
      })
    })
  }
  async getBlock (hashOrNumber) {
    let block = await this.getBlockFromDb(hashOrNumber)
    if (block && block.hash === hashOrNumber) {
      return Promise.resolve(block)
    } else {
      return getBlock(this.web3, this.collections, hashOrNumber, this.log)
        .then(res => {
          if (res.error) return
          return res.block
        })
    }
  }

  getBlockFromDb (hashOrNumber) {
    return getBlockFromDb(hashOrNumber, this.Blocks)
  }

  getBlocks (check) {
    let segments = check.missingSegments
    let invalid = check.invalid
    let values = []
    if (segments) {
      segments.forEach(segment => {
        let number = segment[0]
        let limit = segment[1]
        while (number >= limit) {
          values.push(number)
          number--
        }
      })
    }
    if (invalid) {
      invalid.forEach(block => {
        values.push(block.validHash)
      })
    }
    if (values.length) {
      process.send({ action: this.actions.BULK_BLOCKS_REQUEST, args: [values] })
    }
  }

  async dbBlocksStatus () {
    let lastBlock = await this.getHighDbBlock()
    lastBlock = lastBlock.number
    let blocks = await this.countDbBlocks()
    return { blocks, lastBlock }
  }

  getHighDbBlock () {
    return this.Blocks.findOne({}, { sort: { number: -1 } })
  }

  countDbBlocks () {
    return this.Blocks.countDocuments({})
  }
  setTipBlock (number) {
    this.tipBlock = number || null
  }
  setTipCount (number) {
    this.tipCount = (number) ? this.tipCount + number : 0
  }

  updateTipBlock (block) {
    if (!block || !block.number) return
    let number = block.number
    let tipBlock = this.tipBlock
    if (!tipBlock) this.setTipBlock(number)
    if (number > tipBlock) {
      this.setTipBlock(number)
      this.setTipCount(number)
      if (this.tipCount > this.tipSize) {
        let lastBlock = this.tipCount - this.tipSize
        this.setTipCount()
        this.log.debug(`Checking parents from block ${lastBlock}`)
        this.getOrphans(lastBlock)
          .then(blocks => this.getBlocks(blocks))
      }
    }
  }
}

export const checkBlocksCongruence = async (blocksCollection, lastBlock) => {
  try {
    let blocks = {}
    let query = (lastBlock) ? { number: { $lt: lastBlock } } : {}
    await blocksCollection.find(query)
      .project({ _id: 0, number: 1, hash: 1, parentHash: 1 })
      .sort({ number: -1 })
      .forEach(block => {
        blocks[block.number] = block
      })
    let missing = []
    let invalid = []
    for (let number in blocks) {
      if (number > 0) {
        let block = blocks[number]
        let parentNumber = number - 1
        let parent = blocks[parentNumber]
        if (!parent) {
          missing.push(parentNumber)
        } else {
          if (parent.hash !== block.parentHash) {
            parent.validHash = block.parentHash
            invalid.push(parent)
          }
        }
      }
    }
    return { missing, invalid }
  } catch (err) {
    return Promise.reject(err)
  }
}

export default CheckBlocks

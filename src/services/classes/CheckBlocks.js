import { BlocksBase } from '../../lib/BlocksBase'
import { getBlockFromDb } from './Block'
import { getBlock } from './RequestBlocks'

export class CheckBlocks extends BlocksBase {
  constructor (db, options) {
    super(db, options)
    this.Blocks = this.collections.Blocks
    this.tipBlock = null
    this.tipCount = 0
    this.tipSize = options.bcTipSize || 12
  }

  start () {
    Promise.all([this.getBlock(0), this.getLastBlock()])
      .then(() => this.checkDb(true).then(res => this.getBlocks(res)))
  }

  async checkDb (checkOrphans, lastBlock) {
    if (!lastBlock || !lastBlock.number) lastBlock = await this.getHighDbBlock()
    lastBlock = lastBlock.number
    let blocks = await this.countDbBlocks()

    let missingSegments = []
    if (blocks < lastBlock + 1) {
      missingSegments = await this.getMissingSegments()
    }
    let res = { lastBlock, blocks, missingSegments }
    if (checkOrphans) {
      let orphans = await this.getOrphans(lastBlock)
      res = Object.assign(res, orphans)
    }
    return res
  }

  async getOrphans (lastBlock) {
    this.log.debug(`Checking orphan blocks from ${lastBlock}`)
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
    return this.nod3.eth.getBlock('latest', false)
  }

  async getBlock (hashOrNumber) {
    return getBlock(this.nod3, this.collections, hashOrNumber, this.log)
  }

  getBlockFromDb (hashOrNumber) {
    return getBlockFromDb(hashOrNumber, this.Blocks)
  }

  getBlocks (check) {
    let segments = check.missingSegments || []
    let invalid = check.invalid || []
    let values = []
    segments.forEach(segment => {
      if (Array.isArray(segment)) {
        let number = segment[0]
        let limit = segment[1]
        while (number >= limit) {
          values.push(number)
          number--
        }
      } else {
        values.push(segment)
      }
    })
    invalid.forEach(block => {
      values.push(block.validHash)
    })
    if (values.length) {
      this.log.warn(`Getting ${values.length} bad blocks`)
      this.log.trace(values)
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
    let tipBlock = this.tipBlock
    let tip = (number > tipBlock) ? number : tipBlock
    this.tipCount += tip - tipBlock
    this.tipBlock = tip
  }

  updateTipBlock (block) {
    if (!block || !block.number) return
    let number = block.number
    this.setTipBlock(number)
    this.log.trace(`TipCount: ${this.tipCount} / TipBlock: ${this.tipBlock} / Block: ${number}`)
    if (this.tipCount >= this.tipSize) {
      let lastBlock = this.tipBlock
      this.tipCount = 0
      this.log.info(`Checking db / LastBlock: ${lastBlock}`)
      return this.checkDb(true, lastBlock)
        .then(res => this.getBlocks(res))
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

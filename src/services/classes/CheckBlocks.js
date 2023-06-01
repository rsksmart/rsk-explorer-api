import { BlocksBase } from '../../lib/BlocksBase'
import { getBlockFromDb } from './Block'
import { getBlock } from './RequestBlocks'
import { chunkArray } from '../../lib/utils'
import { blockRepository } from '../../repositories/block.repository'

export class CheckBlocks extends BlocksBase {
  constructor (db, options) {
    super(db, options)
    this.Blocks = this.collections.Blocks
    this.tipBlock = null
    this.tipCount = 0
    this.tipSize = options.bcTipSize || 120
  }

  async saveTipBlocks () {
    await this.getBlock(0).catch(err => this.log.trace(err))
    let lastBlock = await this.getLastBlock().catch(err => this.log.trace(err))
    await this.getBlock(lastBlock.hash).catch(err => this.log.trace(err))
  }
  async start (emitter) {
    try {
      if (emitter) this.setEmitter(emitter)
      if (!this.emit) throw new Error('The emitter should be defined')
      await this.saveTipBlocks()
      this.log.info('Checking database')
      let res = await this.checkDb()
      this.log.info('Getting missing blocks')
      if (!res) this.log.info('There are no missing blocks')
      else this.log.trace(res)
      return this.getBlocks(res)
    } catch (err) {
      this.log.error(`[CheckBlocks.start] ${err}`)
      return Promise.reject(err)
    }
  }

  async checkDb ({ lastBlock }) {
    if (!lastBlock || !lastBlock.number) lastBlock = await this.getHighDbBlock()
    if (!lastBlock) return
    lastBlock = lastBlock.number
    let blocks = await this.countDbBlocks()

    let res = { lastBlock, blocks }
    return res
  }

  getLastBlock () {
    return this.nod3.eth.getBlock('latest', false)
  }

  async getBlock (hashOrNumber) {
    const { nod3, collections, log, initConfig } = this
    return getBlock(hashOrNumber, { nod3, collections, log, initConfig })
  }

  getBlockFromDb (hashOrNumber) {
    return getBlockFromDb(hashOrNumber, this.Blocks)
  }

  getBlocks (check) {
    check = check || {}
    try {
      let segments = check.missingSegments || []
      let invalid = check.invalid || []
      let missingTxs = check.missingTxs || []
      let values = []

      missingTxs.forEach(block => {
        values.push(block.number)
      })

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
        let { log, emit, events } = this
        log.warn(`Getting ${values.length} bad blocks`)
        log.trace(values)
        let chunks = chunkArray(values, 100)
        for (let blocks of chunks) {
          emit(events.REQUEST_BLOCKS, { blocks })
        }
      }
    } catch (err) {
      this.log.error(err)
    }
  }

  async dbBlocksStatus () {
    let lastBlock = await this.getHighDbBlock()
    lastBlock = lastBlock.number
    let blocks = await this.countDbBlocks()
    return { blocks, lastBlock }
  }

  getHighDbBlock () {
    return blockRepository.findOne({}, { sort: { number: -1 } }, this.Blocks)
  }

  countDbBlocks () {
    return blockRepository.countDocuments({}, this.Blocks)
  }
  setTipBlock (number) {
    let tipBlock = this.tipBlock
    let tip = (number > tipBlock) ? number : tipBlock
    this.tipCount += tip - tipBlock
    this.tipBlock = tip
  }

  async updateTipBlock (block) {
    try {
      if (!block || !block.number) return
      let number = block.number
      this.setTipBlock(number)
      this.log.trace(`TipCount: ${this.tipCount} / TipBlock: ${this.tipBlock} / Block: ${number}`)
      if (this.tipCount >= this.tipSize) {
        let lastBlock = this.tipBlock
        this.tipCount = 0
        this.log.info(`Checking db / LastBlock: ${lastBlock}`)
        let firstBlock = lastBlock - this.tipSize
        let res = await this.checkDb({ checkOrphans: true, lastBlock, firstBlock })
        this.log.trace(`Check db: ${res}`)
        return this.getBlocks(res)
      }
    } catch (err) {
      this.log.error(`Error updating tip: ${err}`)
    }
  }
}

export default CheckBlocks

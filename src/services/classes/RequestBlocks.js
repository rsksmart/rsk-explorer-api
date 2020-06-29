
import { BlocksBase } from '../../lib/BlocksBase'
import { Block, getBlockFromDb } from './Block'
import { isBlockHash } from '../../lib/utils'
import { updateTokenAccountBalances } from './UpdateTokenAccountBalances'

export class RequestBlocks extends BlocksBase {
  constructor (db, { log, initConfig, debug, blocksQueueSize, updateTokenBalances }) {
    super(db, { log, initConfig, debug })
    this.queueSize = blocksQueueSize || 50
    this.pending = new Set()
    this.requested = new Map()
    this.maxRequestTime = 1000
    this.updateTokenBalances = updateTokenBalances
    this.blocksCollection = this.collections.Blocks
    this.emit = (event, data) => {
      log.warn(`Event ${event} received but emitter is not defined`)
    }
  }

  setEmitter (emitter) {
    this.emit = emitter
  }

  request (key, prioritize) {
    let add = this.addToPending(key, prioritize)
    if (add) this.processPending()
  }

  bulkRequest (keys) {
    if (!Array.isArray(keys)) throw new Error(`Keys must be an array`)
    for (let key of keys) {
      this.addToPending(key)
    }
    this.processPending()
  }

  addToPending (key, prioritize) {
    if (this.isRequested(key)) {
      this.log.trace(`The key ${key} is already requested`)
      return
    }
    if (prioritize) {
      let pending = [...this.pending]
      pending.unshift(key)
      this.pending = new Set(pending)
    } else {
      this.pending.add(key)
    }
    return true
  }

  processPending () {
    let i = this.pending.values()
    let free = this.queueSize - this.requested.size
    let total = this.requested.size + this.pending.size
    if (total === 0) {
      this.emit(this.events.QUEUE_DONE, {})
      this.updateStatus()
    }
    while (free > -1) {
      let key = i.next().value
      if (!key) return
      this.pending.delete(key)
      this.requestBlock(key)
      free--
    }
  }

  async requestBlock (key) {
    try {
      this.requested.set(key, Date.now())
      this.emit(this.events.BLOCK_REQUESTED, { key })
      this.log.debug(this.events.BLOCK_REQUESTED, { key })
      this.updateStatus()
      let block = await this.getBlock(key)
      if (block.error) {
        this.log.debug(this.events.BLOCK_ERROR, block.error)
      }
      this.endRequest(key, block)
    } catch (err) {
      this.log.error(err)
      this.endRequest(key)
    }
  }

  async getBlock (hashOrNumber) {
    try {
      let hash = (isBlockHash(hashOrNumber)) ? hashOrNumber : null
      if (!hash) {
        this.log.debug(`Searching for best block for: ${hashOrNumber}`)
        let blocks = await this.nod3.rsk.getBlocksByNumber(hashOrNumber)
        hash = blocks.find(b => b.inMainChain === true)
        hash = hash.hash || null
        this.log.debug(`${hashOrNumber}: ${hash}`)
      }
      hash = hash || hashOrNumber
      const { nod3, collections, log, initConfig } = this
      let result = await getBlock(hash, { nod3, collections, log, initConfig })

      if (this.updateTokenBalances) {
        let { block } = result
        if (block) await updateTokenAccountBalances(block, { nod3, collections, initConfig, log })
      }
      return result
    } catch (err) {
      return Promise.reject(err)
    }
  }

  endRequest (key, res) {
    let time = Date.now() - this.requested.get(key)
    this.requested.delete(key)
    this.pending.delete(key)
    this.log.trace(`Key ${key} time: ${time}`)
    if (res && res.block) {
      let block = this.getBlockData(res.block)
      this.emit(this.events.BLOCK_SAVED, { key, block })
      res = undefined
      this.requestParentBlock({ key, block })
    }
    this.processPending()
  }

  async requestParentBlock ({ key, block }) {
    try {
      if (!block) return
      let isHashKey = isBlockHash(key)
      let data = this.getBlockData(block)
      this.emit(this.events.NEW_TIP_BLOCK, data)
      let show = (isHashKey) ? block.number : block.hash
      this.log.debug(this.events.NEW_BLOCK, `New Block DATA ${key} - ${show}`)
      let { parentHash } = block
      let parentBlock = await getBlockFromDb(parentHash, this.blocksCollection)
      if (!parentBlock && block.number) {
        this.log.debug(`Getting parent of block ${block.number} - ${parentHash}`)
        this.request(parentHash, true)
      }
      this.updateStatus()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  isRequestedOrPending (key) {
    return this.isRequested(key) || this.isPending(key)
  }

  isPending (key) {
    return this.pending.has(key)
  }

  isRequested (key) {
    let isRequested = this.requested.has(key)
    return (isRequested) ? ((Date.now() - this.requested.get(key)) < this.maxRequestTime) : false
  }

  getRequested () {
    return this.requested.size
  }

  getPending () {
    return this.pending.size
  }
  updateStatus (state) {
    state = state || {}
    state.requestingBlocks = this.getRequested()
    state.pendingBlocks = this.getPending()
    this.emit(this.events.NEW_STATUS, state)
  }
}

export async function getBlock (hashOrNumber, { nod3, collections, log, initConfig }) {
  if (hashOrNumber !== 0 && !isBlockHash(hashOrNumber)) throw new Error(`Invalid blockHash: ${hashOrNumber}`)
  const key = hashOrNumber
  try {
    let newBlock = new Block(hashOrNumber, { nod3, collections, log, initConfig })
    let result = await newBlock.save()
    if (!result || !result.data) return { key }
    let { block } = result.data
    return { block, key }
  } catch (error) {
    return { error, key }
  }
}

export default RequestBlocks

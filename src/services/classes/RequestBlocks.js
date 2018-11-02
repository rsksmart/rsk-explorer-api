
import { EventEmitter } from 'events'
import { BlocksBase } from '../../lib/BlocksBase'
import { events as et, actions as a } from '../../lib/types'
import { getBlockFromDb, Block } from './Block'
import { isBlockHash } from '../../lib/utils'

class Emitter extends EventEmitter { }

export class RequestBlocks extends BlocksBase {
  constructor (db, options) {
    super(db, options)
    this.queueSize = options.blocksQueueSize || 50
    this.pending = new Set()
    this.requested = new Set()
    this.events = (options.noEvents) ? null : new Emitter()
  }

  emit (event, data) {
    let events = this.events
    if (events) {
      events.emit(event, data)
    }
  }

  request (key, prioritize) {
    let add = this.addToPending(key, prioritize)
    if (add) this.processPending()
  }

  bulkRequest (keys) {
    for (let key of keys) {
      this.addToPending(key)
    }
    this.processPending()
  }

  addToPending (key, prioritize) {
    if (this.isRequested(key)) return
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
    if (total === 0) this.emit(et.QUEUE_DONE)
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
      this.requested.add(key)
      this.emit(et.BLOCK_REQUESTED, { key })
      let block = await this.getBlock(key)
      if (block.error) this.emit(et.BLOCK_ERROR, block)
      this.endRequest(key)
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
      let block = await getBlock(this.nod3, this.collections, hash, this.log)
      return block
    } catch (err) {
      return Promise.reject(err)
    }
  }

  endRequest (key, res) {
    this.requested.delete(key)
    this.pending.delete(key)
    if (res && res.block) {
      let block = res.block
      this.emit(et.NEW_BLOCK, { key, block })
      process.send({ action: a.UPDATE_TIP_BLOCK, args: [block] })
      return res.block
    }
    this.processPending()
  }

  isRequested (key) {
    return this.requested.has(key) || this.pending.has(key)
  }

  getRequested () {
    return this.requested.size
  }

  getPending () {
    return this.pending.size
  }
}

export async function getBlock (nod3, collections, hashOrNumber, Logger) {
  if (isBlockHash(hashOrNumber)) {
    let block = await getBlockFromDb(hashOrNumber, collections.Blocks)
    if (block) return { block, key: hashOrNumber }
  }
  try {
    let newBlock = new Block(hashOrNumber, { nod3, collections, Logger })
    let block = await newBlock.save().then(res => {
      if (!res || !res.data) return
      return res.data.block
    })
    return { block, key: hashOrNumber }
  } catch (error) {
    return { error, key: hashOrNumber }
  }
}

export default RequestBlocks

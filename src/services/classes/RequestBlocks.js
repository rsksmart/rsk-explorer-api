
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

  requestBlock (key) {
    this.requested.add(key)
    this.emit(et.BLOCK_REQUESTED, { key })
    return this.getBlock(key)
      .then(res => {
        if (res.error) {
          this.emit(et.BLOCK_ERROR, res)
        }
        this.endRequest(key, res)
      })
  }

  getBlock (hashOrNumber) {
    return getBlock(this.web3, this.collections, hashOrNumber, this.log)
  }

  endRequest (key, res) {
    this.requested.delete(key)
    this.pending.delete(key)
    if (res && res.block) {
      let block = res.block
      this.emit(et.NEW_BLOCK, { key, block })
      process.send({ action: a.UPDATE_TIP_BLOCK, args: [block] })
      this.processPending()
      return res.block
    }
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

export async function getBlock (web3, collections, hashOrNumber, Logger) {
  if (isBlockHash(hashOrNumber)) {
    let block = await getBlockFromDb(hashOrNumber, collections.Blocks)
    if (block) return { block, key: hashOrNumber }
  }
  try {
    let Blck = new Block(hashOrNumber, { web3, collections, Logger })
    let block = await Blck.save().then(res => {
      if (!res || !res.block) return
      return { block: res.block.data.block }
    })
    return { block, key: hashOrNumber }
  } catch (error) {
    return { error, key: hashOrNumber }
  }
}

export default RequestBlocks

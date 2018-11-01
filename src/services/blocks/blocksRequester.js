import { RequestBlocks } from '../classes/RequestBlocks'
import { events as et, actions as a } from '../../lib/types'
import { isBlockHash } from '../../lib/utils'
import { getBlockFromDb } from '../classes/Block'
import { dataSource } from '../../lib/dataSource'
import Logger from '../../lib/Logger'
import config from '../../lib/config'

const options = Object.assign({}, config.blocks)
const log = Logger('Blocks', options.log)
options.Logger = log

dataSource.then(db => {
  let Requester = new RequestBlocks(db, options)
  const blocksCollection = Requester.collections.Blocks
  Requester.updateStatus = function (state) {
    state = state || {}
    state.requestingBlocks = this.getRequested()
    state.pendingBlocks = this.getPending()
    let action = a.STATUS_UPDATE
    process.send({ action, args: [state] })
  }
  process.on('message', msg => {
    let action = msg.action
    let args = msg.args
    if (action) {
      switch (action) {
        case a.BLOCK_REQUEST:
          Requester.request(...args)
          break

        case a.BULK_BLOCKS_REQUEST:
          Requester.bulkRequest(...args)
          break
      }
    }
  })

  Requester.events.on(et.QUEUE_DONE, data => {
    Requester.updateStatus()
  })

  Requester.events.on(et.BLOCK_REQUESTED, data => {
    log.debug(et.BLOCK_REQUESTED, data)
    Requester.updateStatus()
  })

  Requester.events.on(et.BLOCK_ERROR, data => {
    log.debug(et.BLOCK_ERROR, data)
  })

  Requester.events.on(et.NEW_BLOCK, data => {
    let block = data.block
    if (!block) return
    let key = data.key
    let isHashKey = isBlockHash(key)
    if (block) {
      let show = (isHashKey) ? block.number : block.hash
      log.debug(et.NEW_BLOCK, `New Block DATA ${key} - ${show}`)
      let parent = block.parentHash

      getBlockFromDb(parent, blocksCollection).then(parentBlock => {
        if (!parentBlock && block.number) {
          log.debug(`Getting parent of block ${block.number} - ${parent}`)
          Requester.request(parent, true)
        }
      })
    }
    Requester.updateStatus()
  })
})

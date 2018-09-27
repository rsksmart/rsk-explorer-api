import { RequestBlocks } from '../classes/RequestBlocks'
import { events as et } from '../../lib/types'
import { isBlockHash } from '../../lib/utils'
import { BlocksStatus } from '../classes/BlocksStatus'
import { getBlockFromDb } from '../classes/Block'

export const BlocksRequester = (db, options) => {
  let Requester = new RequestBlocks(db, options)
  let log = options.Logger || console
  const Status = new BlocksStatus(db, options)
  const blocksCollection = Requester.collections.Blocks

  Requester.updateStatus = function (state) {
    state = state || {}
    state.requestingBlocks = this.getRequested()
    state.pendingBlocks = this.getPending()
    return Status.update(state)
  }

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
    let key = data.key
    let isHashKey = isBlockHash(key)
    if (block) {
      let show = (isHashKey) ? block.number : block.hash
      log.debug(et.NEW_BLOCK, `New Block DATA ${key} - ${show}`)
      let parent = block.parentHash

      getBlockFromDb(parent, blocksCollection).then(parentBlock => {
        if (!parentBlock) {
          log.debug(`Getting parent of block ${block.number} - ${parent}`)
          Requester.request(parent, true)
        }
      })
    }
    Requester.updateStatus()
  })

  return Requester
}

import { RequestBlocks } from '../classes/RequestBlocks'
import { events as et } from '../../lib/types'
import { isBlockHash } from '../../lib/utils'
import { BlocksStatus } from '../classes/BlocksStatus'

export const BlocksRequester = (db, options) => {
  let Requester = new RequestBlocks(db, options)
  let log = options.Logger || console
  const Status = new BlocksStatus(db, options)

  Requester.updateStatus = function (state) {
    state = state || {}
    state.requestingBlocks = this.getRequested()
    state.pendingBlocks = this.getPending()
    return Status.update(state)
  }

  Requester.events.on(et.BLOCK_REQUESTED, data => {
    log.debug(et.BLOCK_REQUESTED, data)
    Requester.updateStatus()
  })

  Requester.events.on(et.NEW_BLOCK, data => {
    let block = data.block
    let key = data.key
    let isHashKey = isBlockHash(key)
    if (block) {
      let show = (isHashKey) ? block.number : block.hash
      log.debug(et.NEW_BLOCK, `New Block ${key} - ${show}`)
      // get block parent only when request by hash
      if (isHashKey) {
        let parent = block.parentHash
        log.debug(`Getting parent of block ${block.number} - ${parent}`)
        Requester.request(parent, true)
      }
    }
    Requester.updateStatus()
  })

  return Requester
}

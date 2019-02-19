import dataSource from '../lib/dataSource.js'
import { getDbBlocksCollections } from '../lib/blocksCollections'
import conf from '../lib/config'
import nod3 from '../lib/nod3Connect'
import Address from './classes/Address'
import Logger from '../lib/Logger'
import { errors } from '../lib/types'
import { serialize } from '../lib/utils'

const config = Object.assign({}, conf.blocks)
const log = Logger('UserRequests', config.log)

dataSource.then(db => {
  const collections = getDbBlocksCollections(db)
  const cache = new RequestCache()
  process.on('message', msg => {
    let { action, params, block } = msg
    if (action && params && block) {
      switch (action) {
        case 'updateAddress':
          updateAddress({ collections, cache, msg }, params)
          break
      }
    }
  })
})

const updateAddress = async ({ collections, cache, msg }, { address }) => {
  try {
    const { block, action, module } = msg
    const cached = cache.isRequested(block, [module, action, address])
    if (cached) {
      msg.data = cached
      sendMessage(msg)
    } else {
      const Addr = new Address(address, { nod3, collections })
      let result = await Addr.fetch()
        .catch(err => {
          log.error(err)
          msg.error = errors.TEMPORARILY_UNAVAILABLE
          sendMessage(msg)
        })
      msg.result = result
      cache.set(block, [module, action, address], result)
      const newBalance = (result.balance) ? result.balance.toString() : 0
      const dbData = Addr.dbData || {}
      const { balance, txBalance } = dbData
      if (newBalance > 0 || balance) {
        if (!parseInt(txBalance)) await Addr.updateTxBalance()

        await Addr.save().catch(err => {
          log.error(`Error saving address ${address}, ${err}`)
          sendMessage(msg)
        })
        sendMessage(msg)
      } else {
        msg.data = result
        sendMessage(msg)
      }
    }
  } catch (err) {
    log.debug(err)
    msg.error = err
    sendMessage(msg)
  }
}

const sendMessage = (msg) => {
  process.send(serialize(msg))
}

class RequestCache {
  constructor () {
    this.requested = {}
    this.block = null
  }
  set (block, keys, value) {
    this.setBlock(block)
    this.requested[this.makeKey(keys)] = value
  }
  isRequested (block, keys) {
    this.setBlock(block)
    return this.requested[this.makeKey(keys)]
  }
  setBlock (block) {
    if (block !== this.block) {
      this.block = block
      this.requested = {}
    }
  }
  makeKey (args) {
    return args.join('-')
  }
}

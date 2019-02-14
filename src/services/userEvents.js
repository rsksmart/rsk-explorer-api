import dataSource from '../lib/dataSource.js'
import conf from '../lib/config'
import nod3 from '../lib/nod3Connect'
import Address from './classes/Address'
import Logger from '../lib/Logger'
import { errors } from '../lib/types'
import { serialize } from '../lib/utils'

const config = Object.assign({}, conf.blocks)
const log = Logger('UserRequests', config.log)

dataSource.then(db => {
  const addressCollection = db.collection(config.collections.Addrs)
  const cache = new RequestCache()
  process.on('message', msg => {
    let { module, action, params, block } = msg
    if (action && params && block) {
      switch (action) {
        case 'updateAddress':
          try {
            const address = params.address
            const cached = cache.isRequested(block, [module, action, address])
            if (cached) {
              msg.data = cached
              sendMessage(msg)
            } else {
              const Addr = new Address(address, { nod3, db: addressCollection })
              Addr.fetch().then(result => {
                msg.result = result
                cache.set(block, [module, action, address], result)
                const balance = (result.balance) ? result.balance.toString() : 0
                const dbBalance = (Addr.dbData) ? Addr.dbData.balance : null
                if (balance > 0 || dbBalance) {
                  Addr.save()
                    .then(() => {
                      sendMessage(msg)
                    })
                    .catch(err => {
                      log.error(`Error saving address ${address}, ${err}`)
                      sendMessage(msg)
                    })
                } else {
                  msg.data = result
                  sendMessage(msg)
                }
              }).catch(err => {
                log.error(err)
                msg.error = errors.TEMPORARILY_UNAVAILABLE
                sendMessage(msg)
              })
            }
          } catch (err) {
            log.debug(err)
            msg.error = err
            sendMessage(msg)
          }
          break
      }
    }
  })
})

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

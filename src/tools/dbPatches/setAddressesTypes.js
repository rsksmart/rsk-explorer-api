import config from '../../lib/config'
import datasource from '../../lib/dataSource'
import Logger from '../../lib/Logger'
import web3Connect from '../../lib/web3Connect'
import { Blocks } from '../../services/blocks/Blocks.js'
const log = Logger('updateAccountsBalances')
const web3 = web3Connect(config.blocks.node, config.blocks.port)

datasource.then((db) => {
  let Addresses = db.collection(config.blocks.addrCollection)
  Blocks(config.blocks, db).then((blocks) => {
    update(Addresses, blocks)
  })
})

const update = (Addrs, blocks) => {

  if (web3.isConnected()) {
    let n = 0
    Addrs.count().then((total) => {
      Addrs.find().forEach((address) => {
        n++
        log.info(`Address ${n} of ${total}, ${address.address}`)
        blocks.insertAddress(address).then(res => {
          log.info(`Updated: ${address.address}`)
        }).catch(err => {
          log.error(`ERROR ${address.address}: ${err}`)
        })
      })
    })
  } else {
    log.info('web3 is not connected')
    update(Addrs)
  }
}



process.on('unhandledRejection', (err) => {
  log.error(err)
})
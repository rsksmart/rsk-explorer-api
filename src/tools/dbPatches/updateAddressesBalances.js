import config from '../../lib/config'
import datasource from '../../lib/dataSource'
import Logger from '../../lib/Logger'
import web3Connect from '../../lib/web3Connect'

const log = Logger('updateAccountsBalances')
const web3 = web3Connect(config.blocks.node, config.blocks.port)


datasource.then((db) => {
  let Addresses = db.collection(config.blocks.addrCollection)
  update(Addresses)
})

const update = (Addrs) => {

  if (web3.isConnected()) {
    let n = 0
    Addrs.count().then((total) => {
      Addrs.find().forEach((address) => {
        n++
        log.info(`Getting Balance ${n} of ${total}, ${address.address}`)
        if (isAddress(address.address)) {
          web3.eth.getBalance(address.address, 'latest', (err, balance) => {
            log.info(`Updating balance of address ${address.address}`)
            if (!err) {
              address.balance = balance
              Addrs.updateOne({ _id: address._id }, { $set: address }).catch((err) => log.error(err))
            }
          })
        }
      })
    })
  } else {
    log.info('web3 is not connected')
    update(Addrs)
  }
}

const isAddress = address => {
  if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
    // check if it has the basic requirements of an address
    return false
  } else if (
    /^(0x)?[0-9a-f]{40}$/.test(address) ||
    /^(0x)?[0-9A-F]{40}$/.test(address)
  ) {
    // If it's all small caps or all all caps, return true
    return true
  } else {
    // Otherwise check each case
    return false
  }
}

process.on('unhandledRejection', (err) => {
  log.error(err)
})
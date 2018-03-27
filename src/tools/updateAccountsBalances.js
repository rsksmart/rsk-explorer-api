import config from '../lib/config'
import datasource from '../lib/dataSource'
import Logger from '../lib/Logger'
import web3Connect from '../lib/web3Connect'

const log = Logger('updateAccountsBalances')
const web3 = web3Connect(config.blocks.node, config.blocks.port)


datasource.then((db) => {
  let Accounts = db.collection(config.blocks.accountsCollection)
  update(Accounts)
})

const update = (Accounts) => {

  if (web3.isConnected()) {
    let n = 0
    Accounts.count().then((total) => {
      Accounts.find().forEach((account) => {
        n++
        log.info(`Getting Balance ${n} of ${total}, ${account.address}`)
        if (isAddress(account.address)) {
          web3.eth.getBalance(account.address, 'latest', (err, balance) => {
            log.info(`Updating balance of account ${account.address}`)
            if (!err) {
              account.balance = balance
              Accounts.updateOne({ _id: account._id }, { $set: account }).catch((err) => log.error(err))
            }
          })
        }
      })
    })
  } else {
    log.info('web3 is not connected')
    update(Accounts)
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
import config from '../../lib/config'
import datasource from '../../lib/dataSource'
import Logger from '../../lib/Logger'
import web3Connect from '../../lib/web3Connect'

const log = Logger('getTxReceipt')
const web3 = web3Connect(config.blocks.node, config.blocks.port)


datasource.then((db) => {
  let Txs = db.collection(config.blocks.txCollection)
  update(Txs)
})

const update = (Txs) => {

  if (web3.isConnected()) {
    let n = 0
    Txs.count().then((total) => {
      Txs.find().forEach((tx) => {
        n++
        log.info(`Getting Receipt ${n} of ${total}, ${tx.hash}`)
        if (!tx.receipt) {
          web3.eth.getTransactionReceipt(tx.hash, (err, receipt) => {
            if (!err) {
              Txs.updateOne({ _id: tx._id }, { $set: { receipt} }).catch((err) => log.error(err))
            } else {
              log.error(`ERROR: ${err}`)
            }
          })
        } else {
          log.info(`Skipping tx ${tx.hash}`)
        }
      })
    })
  } else {
    log.info('web3 is not connected')
    update(Txs)
  }
}

process.on('unhandledRejection', (err) => {
  log.error(err)
})
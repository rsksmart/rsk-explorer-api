import config from '../../lib/config'
import datasource from '../../lib/dataSource'
import Logger from '../../lib/Logger'
import txFormat from '../../lib/txFormat'

const log = Logger('updateTx')

datasource.then((db) => {
  const Tx = db.collection(config.blocks.txCollection)
  let n = 0
  Tx.count().then((total) => {
    Tx.find().forEach((tx) => {
      n++
      log.info(`Updating tx ${n} of ${total}`)
      tx = txFormat(tx)
      Tx.updateOne({ _id: tx._id }, { $set: tx }).catch((err) => log.error(err))
    })
  })
})

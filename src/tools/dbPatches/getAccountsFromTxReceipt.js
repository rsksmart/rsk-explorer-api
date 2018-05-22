import config from '../../lib/config'
import datasource from '../../lib/dataSource'
import Logger from '../../lib/Logger'
import { Blocks } from '../../services/blocks/Blocks.js'

const log = Logger('updateTx')

datasource.then((db) => {
  const Tx = db.collection(config.blocks.txCollection)
  Blocks(config.blocks, db).then((blocks) => {
    let n = 0
    Tx.count().then((total) => {
      Tx.find().forEach((tx) => {
        n++
        log.info(`Tx ${n} of ${total}`)
        if (tx.receipt) {
          let address = tx.receipt.address
          if (address) {
            blocks.insertAddress({ address }).then(res => {
              log.info(`Updated ${address}`)
            }).catch(err => {
              log.error(`ERROR ${err}`)
            })
          }
        }
      })
    })
  })
})

import dataSource from '../lib/dataSource.js'
import config from '../lib/config'
import txFormat from '../lib/txFormat'

dataSource.then(db => {
  const blocks = config.blocks.blocksCollection
  const blocksCollection = db.collection(blocks)
  blocksCollection.dropIndexes().then(res => {
    console.log(`${blocks} collection indexes are removed`)
    console.log('Updating transactions.txType')
    const txsCollection = db.collection(config.blocks.txCollection)
    txsCollection.find({}).forEach(tx => {
      let oldType = tx.txType
      let hash = tx.hash
      tx = txFormat(tx)
      let txType = tx.txType
      if (txType !== oldType) {
        txsCollection.updateOne({ hash }, { $set: { txType } }).then(res => {
          console.log(`Tx: ${hash} has changed type from ${oldType} to ${tx.txType}`)
        })
      } else {
        console.log(`Tx ${tx.hash} was processed`)
      }
    }).then(() => {
      process.exit(0)
    })
  }).catch(err => {
    console.error(`Error removing ${blocks} indexes: ${err}`)
  })
})

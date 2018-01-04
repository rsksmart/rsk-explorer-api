import dataSource from '../../lib/db.js'
import conf from '../../lib/config'
import SaveBlocks from './Blocks'

const config = Object.assign({}, conf.blocks)

dataSource.then(db => {
  console.log('Using configuration:')
  console.log(config)

  createCollection(db, config.blocksCollection, [
    {
      key: { number: 1 },
      unique: true
    }
  ]).then(blocksCollection => {
    createCollection(db, config.txCollection, [
      {
        key: { hash: 1 },
        unique: true
      },
      {
        key: {
          blockNumber: 1,
          transactionIndex: 1
        },
        name: 'blockTrasaction'
      },
      {
        key: { from: 1 },
        name: 'fromIndex'
      },
      {
        key: { to: 1 },
        name: 'toIndex'
      }
    ]).then(txCollection => {
      createCollection(db, config.accountsCollection, [
        {
          key: { address: 1 },
          unique: true
        }
      ]).then(accountsCollection => {
        const exporter = new SaveBlocks(
          config,
          blocksCollection,
          txCollection,
          accountsCollection
        )
        exporter.grabBlocks()
        exporter.patchBlocks()
      })
    })
  })
})

const indexesError = collectionName => {
  console.log('Error creating' + collectionName + 'indexes')
  process.exit(9)
}

const createCollection = (db, collectionName, indexes) => {
  let collection = db.collection(collectionName)
  return collection.createIndexes(indexes).then(doc => {
    if (!doc.ok) indexesError(collectionName)
    return collection
  })
}

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

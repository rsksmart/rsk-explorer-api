import dataSource from '../../lib/dataSource.js'
import conf from '../../lib/config'
import SaveBlocks from './Blocks'
import * as dataBase from '../../lib/Db'

const config = Object.assign({}, conf.blocks)

dataSource.then(db => {
  console.log('Using configuration:')
  console.log(config)

  dataBase.createCollection(db, config.blocksCollection, [
    {
      key: { number: 1 },
      unique: true
    }
  ]).then(blocksCollection => {
    dataBase.createCollection(db, config.txCollection, [
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
      dataBase.createCollection(db, config.accountsCollection, [
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
        exporter.start()
      })
    })
  })
})



process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

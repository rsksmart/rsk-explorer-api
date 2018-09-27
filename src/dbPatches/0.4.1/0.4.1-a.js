import { dataBase } from '../../lib/dataSource.js'
import config from '../../lib/config'
import collections from '../../lib/collections.js'

dataBase.db().then(async db => {
  try {
    let options = { dropIndexes: true, names: config.blocks.collections }
    console.log('Updating indexes')
    await dataBase.createCollections(collections, options)
  } catch (err) {
    console.error(err)
  }
})

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

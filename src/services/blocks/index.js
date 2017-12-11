import dataSource from '../../lib/db.js'
import conf from '../../../config'
import SaveBlocks from './saveBlocksClass'

const config = Object.assign({}, conf.blocks)

dataSource.then(db => {
  console.log('Using configuration:')
  console.log(config)
  const collection = db.collection(config.blockCollection)
  collection
    .createIndexes([
      {
        key: { number: 1 }
      }
    ])
    .then(doc => {
      if (doc.ok) {
        const exporter = new SaveBlocks(config, collection)
        exporter.grabBlocks()
      } else {
        console.log('Error creating collection indexes')
      }
    })
})

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

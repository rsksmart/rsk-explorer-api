import dataSource from '../../lib/db.js'
import conf from '../../lib/config'
import SaveBlocks from './Blocks'

const config = Object.assign({}, conf.blocks)

dataSource.then(db => {
  console.log('Using configuration:')
  console.log(config)
  const blocksCollection = db.collection(config.blockCollection)
  const txCollection = db.collection(config.txCollection)
  blocksCollection
    .createIndexes([
      {
        key: { number: 1 },
        unique: true
      }
    ])
    .then(doc => {
      if (!doc.ok) indexesError('blocksCollection')
      else {
        txCollection
          .createIndexes([
            {
              key: { hash: 1 },
              unique: true
            }
          ])
          .then(doc => {
            if (!doc.ok) indexesError('txCollection')
            else {
              const exporter = new SaveBlocks(
                config,
                blocksCollection,
                txCollection
              )
              exporter.grabBlocks()
              exporter.patchBlocks()
            }
          })
      }
    })
})

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

const indexesError = collectionName => {
  console.log('Error creating' + collectionName + 'indexes')
  process.exit(9)
}

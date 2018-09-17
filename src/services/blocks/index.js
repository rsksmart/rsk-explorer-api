import { dataSource, dataBase } from '../../lib/dataSource.js'
import conf from '../../lib/config'
import blocksCollections from '../../lib/collections'
import { SaveBlocks } from './Blocks'
import Logger from '../../lib/Logger'

const config = Object.assign({}, conf.blocks)
const log = Logger('Blocks', config.log)

dataSource.then(db => {
  config.Logger = log
  createBlocks(config, db)
    .then((blocks) => {
      log.info(`Starting blocks service`)
      blocks.start()
    })
})

async function createBlocks (config, db) {
  try {
    const dbCollections = await dataBase.createCollections(blocksCollections, config)
    let collections = {}
    Object.keys(blocksCollections).forEach((k, i) => {
      collections[k] = dbCollections[i]
    })
    return new SaveBlocks(config, collections)
  } catch (err) {
    log.error('Error creating blocks')
    log.error(err)
    process.exit(9)
  }
}

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

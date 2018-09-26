import { dataBase } from '../../lib/dataSource.js'
import conf from '../../lib/config'
import blocksCollections from '../../lib/collections'
import { SaveBlocks } from './Blocks'
import Logger from '../../lib/Logger'

const config = Object.assign({}, conf.blocks)
const log = Logger('Blocks', config.log)
dataBase.setLogger(log)

dataBase.db().then(db => {
  config.Logger = log
  createBlocks(config, db)
    .then((blocks) => {
      log.info(`Starting blocks service`)
      blocks.start()
    })
})

async function createBlocks (config, db) {
  try {
    let names = config.collections
    let options = { names, validate: true }
    await dataBase.createCollections(blocksCollections, options)
    return new SaveBlocks(db, config)
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

import * as dataBase from '../../lib/Db'
import dataSource from '../../lib/dataSource.js'
import conf from '../../lib/config'
import blocksCollections from './collections'
import { SaveBlocks } from './Blocks'
import Logger from '../../lib/Logger'

const config = Object.assign({}, conf.blocks)
const log = Logger('Blocks', config.log)

dataSource.then(db => {
  log.info(`Using configuration: ${JSON.stringify(config)}`)
  config.Logger = log
  createBlocks(config, db)
    .then((blocks) => {
      blocks.start()
    })
})

function createBlocks (config, db) {
  let queue = []
  let log = config.Logger || console
  for (let c in blocksCollections) {
    let name = config[c] || c
    queue.push(dataBase.createCollection(db, name, blocksCollections[c])
      .then(collection => {
        log.info(`Created collection ${name}`)
        return collection
      })
      .catch(err => {
        log.error(`Error creating collection ${name} ${err}`)
        return Promise.reject(err)
      })
    )
  }
  return Promise.all(queue).then((dbCollections) => {
    let collections = {}
    Object.keys(blocksCollections).forEach((k, i) => {
      collections[k] = dbCollections[i]
    })
    log.info(`Starting blocks service`)
    return new SaveBlocks(config, collections)
  }).catch((err) => {
    log.error('Error creating collections')
    log.error(err)
    process.exit(9)
  })
}

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

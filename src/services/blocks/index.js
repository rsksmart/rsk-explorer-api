import path from 'path'
import { fork } from 'child_process'
import { dataBase } from '../../lib/dataSource.js'
import conf from '../../lib/config'
import blocksCollections from '../../lib/collections'
import Logger from '../../lib/Logger'
import { BlocksStatus } from '../classes/BlocksStatus'
import { actions } from '../../lib/types'

const config = Object.assign({}, conf.blocks)
const log = Logger('Blocks', config.log)
config.Logger = log
dataBase.setLogger(log)

function startService (name, parseMessage, script) {
  script = script || `blocks${name}.js`
  let service = fork(path.resolve(__dirname, script))
  service.on('message', msg => parseMessage(msg, name))
  service.on('error', err => { console.error('Service error', err) })
  return service
}

dataBase.db().then(db => {
  createBlocksCollections(config, db).then(() => {
    const Status = new BlocksStatus(db, config)
    const listenToMessage = (msg, service) => {
      let action, args, event, data
      ({ action, args, event, data } = msg)
      if (event) {
        readEvent(event, data)
      }
      if (action) {
        switch (action) {
          case actions.STATUS_UPDATE:
            Status.update(...args)
            break

          case actions.BLOCK_REQUEST:
          case actions.BULK_BLOCKS_REQUEST:
            Requester.send({ action, args })
            break

          case actions.UPDATE_TIP_BLOCK:
            Checker.send({ action, args })
            break
        }
      }
    }
    /* eslint-disable-next-line no-unused-vars */
    const Listener = startService('Listener', listenToMessage)
    const Checker = startService('Checker', listenToMessage)
    const Requester = startService('Requester', listenToMessage)
    /* eslint-disable-next-line no-unused-vars */
    const TxPool = startService('TxPool', listenToMessage, '../txPool.js')
  })
})

// WIP
const readEvent = (event, data) => {
  log.info(event, data)
}

async function createBlocksCollections (config, db) {
  try {
    let names = config.collections
    let validate = config.validateCollections
    let options = { names, validate }
    await dataBase.createCollections(blocksCollections, options)
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

process.on('uncaughtException', err => {
  console.error(err)
})

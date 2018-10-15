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

function startService (name, parseMessage) {
  let service = fork(path.resolve(__dirname, `${serviceName(name)}.js`))
  service.on('message', msg => parseMessage(msg, name))
  service.on('error', err => { console.error('Service error', err) })
  return service
}

dataBase.db().then(db => {
  createBlocksCollections(config, db).then(() => {
    const Status = new BlocksStatus(db, config)
    // const Requester = BlocksRequester(db, config, Status)
    const listenToMessage = (msg) => {
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
    const Listener = startService('Listener', listenToMessage)
    const Checker = startService('Checker', listenToMessage)
    const Requester = startService('Requester', listenToMessage)
  })
})

// WIP
const readEvent = (event, data) => {
  console.log(event, data)
}

const serviceName = name => `blocks${name}`

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

import path from 'path'
import { fork } from 'child_process'
import conf from '../../lib/config'
import Logger from '../../lib/Logger'
import { BlocksStatus } from '../classes/BlocksStatus'
import { BcStats } from '../classes/BcStats'
import { actions } from '../../lib/types'
import Setup from '../../lib/Setup'

const config = Object.assign({}, conf.blocks)
const log = Logger('Blocks', config.log)
config.log = log

startBlocks()

async function startBlocks () {
  const setup = await Setup({ log })
  await setup.createCollections()
  const { db, initConfig } = await setup.start()
  config.initConfig = initConfig
  const Status = new BlocksStatus(db, config)
  const Stats = new BcStats(db, config)
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
          Stats.update(...args)
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
}

function startService (name, parseMessage, script) {
  script = script || `blocks${name}.js`
  let service = fork(path.resolve(__dirname, script))
  service.on('message', msg => parseMessage(msg, name))
  service.on('error', err => { console.error('Service error', err) })
  return service
}

// WIP
const readEvent = (event, data) => {
  log.info(event, data)
}

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

process.on('uncaughtException', err => {
  console.error(err)
})

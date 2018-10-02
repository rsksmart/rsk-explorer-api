import { dataBase } from '../../lib/dataSource.js'
import conf from '../../lib/config'
import { ListenBlocks } from '../classes/ListenBlocks'
import Logger from '../../lib/Logger'

const config = Object.assign({}, conf.blocks)
const log = Logger('Blocks', config.log)
dataBase.setLogger(log)

dataBase.db().then(db => {
  config.Logger = log
  const listener = new ListenBlocks(db, config)
  log.info(`Starting blocks listener`)
  listener.start()
})

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

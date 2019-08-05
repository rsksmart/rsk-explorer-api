import { setup } from '../lib/dataSource'
import conf from '../lib/config'
import { TxPool } from './classes/TxPool'
import Logger from '../lib/Logger'

const config = Object.assign({}, conf.blocks)
const log = Logger('Blocks', config.log)

setup(log).then(({ db }) => {
  config.Logger = log
  const txPool = new TxPool(db, config)
  log.info(`Starting txPool`)
  txPool.start()
})

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

import dataSource from '../../lib/dataSource.js'
import conf from '../../lib/config'
import Blocks from './Blocks'
import * as dataBase from '../../lib/Db'
import Logger from '../../lib/Logger'

const config = Object.assign({}, conf.blocks)
const log = Logger('Blocks', config.log)



dataSource.then(db => {
  log.info('Using configuration:')
  log.info(config)
  config.Logger = log
  Blocks(config, db).then((blocks) => {
    blocks.start()
  })

})



process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(1)
})

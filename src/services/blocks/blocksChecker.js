import { dataSource } from '../../lib/dataSource.js'
import { actions } from '../../lib/types'
import { CheckBlocks } from '../classes/CheckBlocks'
import conf from '../../lib/config'
import Logger from '../../lib/Logger'

const options = Object.assign({}, conf.blocks)
const log = Logger('Blocks', options.log)
options.log = log

dataSource.then(db => {
  const Checker = new CheckBlocks(db, options)
  Checker.start()
  process.on('message', msg => {
    let action = msg.action
    let args = msg.args
    if (action) {
      switch (action) {
        case actions.CHECK_DB:
          console.log('checkDB', args)
          Checker.checkDb(...args)
          break

        case actions.UPDATE_TIP_BLOCK:
          Checker.updateTipBlock(...args)
          break
      }
    }
  })
})

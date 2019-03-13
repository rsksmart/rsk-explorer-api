import dataSource from '../../lib/dataSource.js'
import { getDbBlocksCollections } from '../../lib/blocksCollections'
import conf from '../../lib/config'

import Logger from '../../lib/Logger'

import { serialize } from '../../lib/utils'
import { RequestCache } from './RequestCache'
import updateAddress from './updateAddress'

const config = Object.assign({}, conf.blocks)
const log = Logger('UserRequests', config.log)

dataSource.then(db => {
  const collections = getDbBlocksCollections(db)
  const cache = new RequestCache()
  process.on('message', async msg => {
    let { action, params, block } = msg

    if (action && params && block) {
      switch (action) {
        case 'updateAddress':
          msg = await updateAddress({ collections, cache, msg, log }, params)
          sendMessage(msg)
          break
      }
    }
  })
})

const sendMessage = (msg) => {
  process.send(serialize(msg))
}

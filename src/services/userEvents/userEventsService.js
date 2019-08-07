import dataSource from '../../lib/dataSource.js'
import { getDbBlocksCollections } from '../../lib/blocksCollections'
import config from '../../lib/config'
import Logger from '../../lib/Logger'
import { serialize } from '../../lib/utils'
import { RequestCache } from './RequestCache'
import AddressModule from './AddressModule'
import ContractVerifierModule from './ContractVerifierModule'

const log = Logger('UserRequests', config.blocks.log)
const verifierConfig = config.api.contractVerifier

dataSource({ log, skipCheck: true }).then(({ db }) => {
  const collections = getDbBlocksCollections(db)
  const cache = new RequestCache()
  // TODO, conditional creation
  const verifierModule = ContractVerifierModule(db, collections, verifierConfig, { log })
  const addressModule = AddressModule(db, collections, { log })

  process.on('message', async msg => {
    try {
      let { action, params, block, module } = msg
      if (module && action) {
        switch (module) {
          // Address module
          case 'Address':
            if (action === 'updateAddress') {
              if (!block) return
              msg = await addressModule.updateAddress({ cache, msg }, params)
              sendMessage(msg)
            }
            break
          // Contract Verifier module
          case 'ContractVerification':
            const method = verifierModule[action]
            if (!method) throw new Error(`Unknow action ${action}`)
            msg = await method(msg)
            sendMessage(msg)
            break
        }
      }
    } catch (err) {
      log.error(err)
    }
  })
})

const sendMessage = (msg) => {
  process.send(serialize(msg))
}

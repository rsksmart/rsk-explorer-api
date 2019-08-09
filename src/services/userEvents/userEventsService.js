import dataSource from '../../lib/dataSource.js'
import { getDbBlocksCollections } from '../../lib/blocksCollections'
import config from '../../lib/config'
import Logger from '../../lib/Logger'
import { serialize } from '../../lib/utils'
import { RequestCache } from './RequestCache'
import AddressModule from './AddressModule'
import ContractVerifierModule from './ContractVerifierModule'
import { errors } from '../../lib/types'

const log = Logger('UserRequests', config.blocks.log)
const verifierConfig = config.api.contractVerifier

dataSource({ log, skipCheck: true }).then(({ db, nativeContracts }) => {
  const collections = getDbBlocksCollections(db)
  const cache = new RequestCache()
  // TODO, conditional creation
  const verifierModule = ContractVerifierModule(db, collections, verifierConfig, { log })
  const addressModule = AddressModule({ db, collections, nativeContracts, log })

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
            try {
              msg = await method(msg)
              sendMessage(msg)
            } catch (err) {
              log.debug(err)
              msg.error = errors.TEMPORARILY_UNAVAILABLE
              sendMessage(msg)
              throw err
            }
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

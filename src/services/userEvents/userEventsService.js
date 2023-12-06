import config from '../../lib/config'
import Logger from '../../lib/Logger'
import { serialize } from '../../lib/utils'
/* import { RequestCache } from './RequestCache'
import AddressModule from './AddressModule' */
import ContractVerifierModule from './ContractVerifierModule'
import { errors } from '../../lib/types'

const log = Logger('[user-events-service]', config.blocks.log)

const verifierConfig = config.api.contractVerifier
// const initConfig = JSON.parse(process.argv[2])
// const cache = new RequestCache()
// TODO, conditional creation
const verifierModule = ContractVerifierModule(verifierConfig, { log })
// const addressModule = AddressModule({ db, collections, initConfig, log })

process.on('message', async msg => {
  const sendMessage = (msg) => process.send(serialize(msg))

  try {
    // let { action, params, block, module } = msg
    let { action, module } = msg
    if (module && action) {
      switch (module) {
        // Address module
        /*          case 'Address':
                    if (action === 'updateAddress') {
                      if (!block) return
                      msg = await addressModule.updateAddress({ cache, msg }, params)
                      sendMessage(msg)
                    }
                    break */
        // Contract Verifier module
        case 'ContractVerification':
          const method = verifierModule[action]
          if (!method) throw new Error(`Unknown action ${action}`)
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

log.info('Online')

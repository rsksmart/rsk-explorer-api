import { errors } from '../../lib/types'
import nod3 from '../../lib/nod3Connect'
import Address from '../classes/Address'

export function AddressModule (db, collections, { log }) {
  log = log || console

  const updateAddress = async ({ msg, cache }, { address }) => {
    try {
      msg = msg || {}
      const { block, action, module } = msg
      const cached = (cache) ? cache.isRequested(block, [module, action, address]) : null
      if (cached) {
        msg.data = cached
        return msg
      } else {
        const Addr = new Address(address, { nod3, collections })
        let result = await Addr.fetch().catch(err => {
          log.error(err)
          msg.error = errors.TEMPORARILY_UNAVAILABLE
          return msg
        })
        msg.result = result
        cache.set(block, [module, action, address], result)
        const newBalance = (result.balance) ? result.balance.toString() : 0
        const dbData = Addr.dbData || {}
        const { balance, txBalance } = dbData
        if (newBalance > 0 || balance) {
          if (!parseInt(txBalance)) await Addr.updateTxBalance()

          await Addr.save().catch(err => {
            log.error(`Error saving address ${address}, ${err}`)
            return msg
          })
          return msg
        } else {
          msg.data = result
          return msg
        }
      }
    } catch (err) {
      log.debug(err)
      msg.error = err
      return msg
    }
  }
  return Object.freeze({ updateAddress })
}

export default AddressModule

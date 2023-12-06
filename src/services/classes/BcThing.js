import { isAddress, serialize, isTxOrBlockHash, isBlockHash } from '../../lib/utils'
import { REPOSITORIES } from '../../repositories'
export class BcThing {
  constructor ({ nod3, initConfig, log, name } = {}) {
    if (!initConfig) throw new Error('missing init config')
    this.initConfig = initConfig
    this.nod3 = nod3
    this.data = {}
    this.log = log || console
    this.repository = REPOSITORIES[name]
  }

  setData (data) {
    if (!data) return
    if (typeof data !== 'object') throw new Error('Data must be an object')
    for (let p in data) {
      this.data[p] = data[p]
    }
  }

  getData (serialize = false) {
    return (serialize) ? this.serialize(this.data) : this.data
  }

  serialize (obj) {
    return serialize(obj)
  }

  isAddress (address) {
    return isAddress(address)
  }

  fetch () {
    return _methodNotImplemented('fetch')
  }

  save () {
    return _methodNotImplemented('save')
  }
  isTxOrBlockHash (str) {
    return isTxOrBlockHash(str)
  }
  isBlockHash (hashOrNumber) {
    return isBlockHash(hashOrNumber)
  }
}

export const _methodNotImplemented = (method) => {
  throw new Error(`Method ${method} is not implemented`)
}

export default BcThing

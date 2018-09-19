import { isAddress, serialize } from '../../lib/utils'

export class BcThing {
  constructor (web3, collections) {
    this.web3 = web3
    this.collections = collections
    this.data = {}
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
}

export const _methodNotImplemented = (method) => {
  throw new Error(`Method ${method} is not implemented`)
}

export default BcThing

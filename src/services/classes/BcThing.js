import { isAddress, serialize } from '../../lib/utils'

export class BcThing {
  constructor (web3) {
    this.web3 = web3
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
    return this._methodNotImplemented('fetch')
  }
  save () {
    return this._methodNotImplemented('save')
  }
  _methodNotImplemented (method) {
    console.error(`Method ${method} is not implemented`)
    return null
  }
}

export default BcThing

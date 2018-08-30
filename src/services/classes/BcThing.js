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
    console.error('Method fetch is not imlpemented')
    return null
  }
}

export default BcThing

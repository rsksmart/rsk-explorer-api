import Address from './Address'
import { isAddress } from '../../lib/utils'

export class Addresses {
  constructor ({ nod3, initConfig }) {
    this.nod3 = nod3
    this.initConfig = initConfig
    this.addresses = {}
  }
  add (address, options = {}) {
    if (!isAddress(address)) throw new Error(`Invalid address ${address}`)
    if (!this.addresses[address]) {
      options = options || {}
      let { nod3, initConfig } = this
      options = Object.assign(options, { nod3, initConfig })
      this.addresses[address] = new Address(address, options)
    }
    return this.addresses[address]
  }

  list () {
    return Object.values(this.addresses)
  }

  async fetch (forceFetch) {
    try {
      let addresses = this.list()
      for (let address of addresses) {
        await address.fetch(forceFetch)
      }
      return addresses.map(a => a.getData())
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

export default Addresses

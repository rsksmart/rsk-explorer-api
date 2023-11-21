import Address from './Address'
import { isAddress } from '../../lib/utils'

export class Addresses {
  constructor ({ nod3, initConfig }) {
    this.nod3 = nod3
    this.initConfig = initConfig
    this.addresses = {}
  }
  createAddress (address, options = {}) {
    if (!isAddress(address)) throw new Error(`Invalid address ${address}`)
    options = options || {}
    let { nod3, initConfig } = this
    options = Object.assign(options, { nod3, initConfig })
    return new Address(address, options)
  }
  add (address, options = {}) {
    if (!this.addresses[address]) {
      this.addresses[address] = this.createAddress(address, options)
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
      return addresses.map(a => a.getData(true))
    } catch (err) {
      return Promise.reject(err)
    }
  }
  async save () {
    try {
      await this.fetch()
      let addresses = this.list()
      let result = await Promise.all([...addresses.map(a => a.save())])
      return result
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

export default Addresses

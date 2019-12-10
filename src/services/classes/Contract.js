import { BcThing } from './BcThing'
import ContractParser from 'rsk-contract-parser'
import { tokensInterfaces } from '../../lib/types'
import TokenAddress from './TokenAddress'
import { hasValue } from '../../lib/utils'

class Contract extends BcThing {
  constructor (address, creationData, { nod3, initConfig }) {
    super({ nod3, initConfig })
    if (!this.isAddress(address)) throw new Error(`Contract: invalid address ${address}`)
    this.parser = new ContractParser({ initConfig, nod3 })
    this.address = address
    this.creationData = creationData
    const createdByTx = (creationData && creationData.tx) ? creationData.tx : null
    this.data = {
      address,
      createdByTx,
      addresses: []
    }
    this.contract = this.makeContract()
    this.addresses = {}
  }

  async fetch () {
    try {
      // new contracts
      if (this.creationData) {
        let txInputData = this.creationData.tx.input
        let info = await this.parser.getContractInfo(txInputData, this.contract)
        let { interfaces, methods } = info
        if (interfaces.length) this.data.contractInterfaces = interfaces
        if (methods) this.data.contractMethods = methods
        if (this.isToken(interfaces)) {
          let tokenData = await this.getTokenData()
          if (tokenData) this.data = Object.assign(this.data, tokenData)
        }
      }

      this.data.addresses = await this.fetchAddresses()
      let data = this.getData()
      return data
    } catch (err) {
      return Promise.reject(err)
    }
  }

  makeContract () {
    return this.parser.makeContract(this.address)
  }

  getTokenData () {
    let { contractMethods } = this.data
    let methods = ['name', 'symbol', 'decimals', 'totalSupply']
    methods = methods.filter(m => contractMethods.includes(`${m}()`))
    return this.parser.getTokenData(this.contract, { methods })
  }

  addAddress (address) {
    if (!this.isAddress(address)) return
    if (!this.addresses[address]) {
      let Address = this.newAddress(address)
      this.addresses[address] = Address
      return Address
    }
  }

  newAddress (address) {
    return new TokenAddress(address, this)
  }

  call (method, params = []) {
    const contract = this.contract
    return this.parser.call(method, contract, params)
  }

  isToken (interfaces) {
    return hasValue(interfaces, tokensInterfaces)
  }
  async fetchAddresses () {
    let data = []
    for (let a in this.addresses) {
      let Address = this.addresses[a]
      let addressData = await Address.fetch()
      if (addressData) data.push(addressData)
    }
    return data
  }
}
export default Contract

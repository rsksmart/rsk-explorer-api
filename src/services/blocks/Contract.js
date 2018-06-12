import ContractParser from '../../lib/ContractParser'
import { contractsTypes as types } from '../../lib/types'
import TokenAddress from './TokenAddress'
import { isAddress } from '../../lib/utils'
class Contract {
  constructor (address, creationData, web3, parser) {
    if (!isAddress(address)) throw new Error(`Contract: invalid address ${address}`)
    parser = parser || new ContractParser(web3)
    this.parser = parser
    this.address = address
    this.creationData = creationData
    const createdByTx = (creationData && creationData.tx) ? creationData.tx.hash : null
    this.data = {
      address,
      createdByTx,
      addresses: []
    }
    this.web3 = web3
    this.contract = this.makeContract()
    this.addresses = {}
  }

  async fetch () {
    // new contracts
    if (this.creationData) {
      let tokenData = await this.getTokenData()
      if (tokenData) this.data = Object.assign(this.data, tokenData)
      let isErc20 = this.isErc20()
      if (isErc20) this.data.contractType = types.ERC20
    }
    this.data.addresses = await this.fetchAddresses()
    return this.getData()
  }

  getData () {
    return this.data
  }

  makeContract () {
    return this.parser.makeContract(this.address)
  }

  getTokenData () {
    return this.parser.getTokenData(this.contract)
  }

  isErc20 () {
    if (this.creationData) {
      return this.parser.hasErc20methods(this.creationData.tx.input)
    }
  }

  addAddress (address) {
    if (!isAddress(address)) return
    if (!this.addresses[address]) {
      let Address = this.newAddress(address)
      this.addresses[address] = Address
      return Address
    }
  }

  newAddress (address) {
    return new TokenAddress(address, this)
  }

  call (method, params) {
    const contract = this.contract
    return this.parser.call(method, contract, params)
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

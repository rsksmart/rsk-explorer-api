import { BcThing } from './BcThing'
import ContractParser from 'rsk-contract-parser'
import { tokensInterfaces } from '../../lib/types'
import TokenAddress from './TokenAddress'
import { hasValue } from '../../lib/utils'

class Contract extends BcThing {
  constructor (address, deployedCode, { dbData, abi, nod3, initConfig, collections }) {
    super({ nod3, initConfig, collections })
    if (!this.isAddress(address)) throw new Error(`Contract: invalid address ${address}`)
    this.address = address
    this.deployedCode = deployedCode
    this.data = {
      address
    }
    this.addresses = {}
    this.fetched = false
    this.contract = undefined
    this.abi = abi
    this.parser = undefined
    if (dbData) this.setData(dbData)
  }

  async fetch () {
    try {
      let { deployedCode, fetched } = this
      if (fetched) return this.getData()
      let contract = await this.getContract()
      // new contracts
      if (deployedCode) {
        let info = await this.parser.getContractInfo(deployedCode, contract)
        let { interfaces, methods } = info
        if (interfaces.length) this.setData({ contractInterfaces: interfaces })
        if (methods) this.setData({ contractMethods: methods })
      }
      let { contractInterfaces, tokenData } = this.data
      let isToken = this.isToken(contractInterfaces)
      if (isToken && !tokenData) {
        let tokenData = await this.getTokenData()
        // if (tokenData) this.data = Object.assign(this.data, tokenData)
        if (tokenData) this.setData(tokenData)
      }
      let addresses = await this.fetchAddresses()
      this.setData({ addresses })
      let data = this.getData()
      this.fetched = true
      return data
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getParser () {
    try {
      let { parser, nod3, initConfig, log } = this
      if (parser) return parser
      let abi = await this.getAbi()
      this.parser = new ContractParser({ abi, nod3, initConfig, log })
      return this.parser
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getContract () {
    try {
      let { address, contract } = this
      if (contract) return contract
      // get abi
      let abi = await this.getAbi()
      let parser = await this.getParser()
      this.contract = parser.makeContract(address, abi)
      return this.contract
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getAbi () {
    try {
      let { address, collections, abi } = this
      if (abi) return abi
      let data = {}
      if (collections) {
        data = await collections.VerificationsResults.findOne({ address })
        if (data && data.abi) this.abi = data.abi
      }
      return this.abi
    } catch (err) {
      return Promise.reject(err)
    }
  }

  getTokenData () {
    let { contractMethods } = this.data
    let { parser, contract } = this
    let methods = ['name', 'symbol', 'decimals', 'totalSupply']
    methods = methods.filter(m => contractMethods.includes(`${m}()`))
    return parser.getTokenData(contract, { methods })
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
    let { contract, parser } = this
    if (!contract) throw new Error('Fetch first')
    return parser.call(method, contract, params)
  }

  isToken (interfaces) {
    return hasValue(interfaces, tokensInterfaces)
  }
  async fetchAddresses () {
    let data = []
    let { addresses } = this
    for (let a in addresses) {
      let Address = addresses[a]
      let addressData = await Address.fetch()
      if (addressData) data.push(addressData)
    }
    return data
  }
}
export default Contract

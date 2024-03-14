import { BcThing } from './BcThing'
import ContractParser from '@rsksmart/rsk-contract-parser'
import { tokensInterfaces } from '../../lib/types'
import TokenAddress from './TokenAddress'
import { chunkArray, hasValue } from '../../lib/utils'
import { REPOSITORIES } from '../../repositories'
import { isNativeContract } from '../../lib/NativeContracts'
import config from '../../lib/config'

class Contract extends BcThing {
  constructor (address, deployedCode, { dbData, abi, nod3, initConfig, block = {} }) {
    super({ nod3, initConfig })
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
    this.isToken = false
    this.isNative = isNativeContract(address)
    this.block = block
    this.verificationResultsRepository = REPOSITORIES.VerificationResults
    if (dbData) this.setData(dbData)
  }

  async fetch () {
    try {
      let { deployedCode, fetched } = this
      if (fetched) return this.getData()
      let contract = await this.setContract(this.block.number)
      if (!this.isNative) {
        // new contracts
        if (!this.data.contractInterfaces) {
          if (!deployedCode) throw new Error(`Missing deployed code for contract: ${this.address}`)
          let info = await this.parser.getContractInfo(deployedCode, contract)
          let { interfaces, methods } = info

          if (!interfaces.length) { // if no interfaces... double check
            const proxyCheckResult = await this.parser.getEIP1967Info(this.address)
            // if proxy detected, the implementation contract interfaces are used
            if (proxyCheckResult && proxyCheckResult.interfaces.length) {
              interfaces = proxyCheckResult.interfaces
            }

            if (proxyCheckResult && proxyCheckResult.methods.length) {
              methods = proxyCheckResult.methods
            }
          }

          if (interfaces.length) this.setData({ contractInterfaces: interfaces })
          if (methods) this.setData({ contractMethods: methods })
        }
        let { contractInterfaces, tokenData } = this.data
        this.isToken = hasValue(contractInterfaces || [], tokensInterfaces)
        // get token data
        if (!tokenData) {
          let tokenData = await this.getTokenData()
          if (tokenData) this.setData(tokenData)
        }
      }
      // update totalSupply
      let totalSupply = await this.getTokenData(['totalSupply'])
      if (undefined !== totalSupply) this.setData(totalSupply)
      let data = this.getData()
      this.fetched = true
      return data
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getParser (txBlockNumber) {
    try {
      let { nod3, initConfig, log } = this
      if (!this.parser) {
        let abi = await this.getAbi()
        this.parser = new ContractParser({ abi, nod3, initConfig, log, txBlockNumber })
      }
      return this.parser
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async setContract (txBlockNumber) {
    try {
      let { address, contract } = this
      if (contract) return contract
      // get abi
      let abi = await this.getAbi()
      let parser = await this.getParser(txBlockNumber)
      this.contract = parser.makeContract(address, abi)
      return this.contract
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getAbi () {
    try {
      if (!this.abi) {
        let abi = await this.getAbiFromVerification()
        this.abi = abi
      }
      return this.abi
    } catch (err) {
      return Promise.reject(err)
    }
  }

  async getAbiFromVerification () {
    try {
      let { address } = this
      const data = await this.verificationResultsRepository.findOne({ address, match: true })
      if (data && data.abi) return data.abi
    } catch (err) {
      return Promise.reject(err)
    }
  }

  getTokenData (methods) {
    let { contractMethods } = this.data
    let { parser, contract } = this
    if (!contractMethods) return
    methods = methods || ['name', 'symbol', 'decimals', 'totalSupply']
    methods = methods.filter(m => contractMethods.includes(`${m}()`))
    if (!methods.length) return
    return parser.getTokenData(contract, { methods })
  }

  addTokenAddress (address) {
    if (this.addresses[address]) return

    this.addresses[address] = new TokenAddress(address, this)
  }

  call (method, params = []) {
    let { contract, parser } = this
    if (!contract) throw new Error('Fetch first')
    return parser.call(method, contract, params)
  }

  async fetchTokenAddressesBalances () {
    if (!this.fetched) await this.fetch()
    if (!this.isToken) return []
    const { addresses, address, contract, nod3 } = this

    const tokenAddresses = Object.keys(addresses)
    const promises = []
    const data = []

    // generate all batch requests promises
    for (const chunk of chunkArray(tokenAddresses, config.blocks.batchRequestSize)) {
      const batchRequest = chunk.map(tokenAddress => ([
        'eth.call',
        { to: address, data: contract.encodeCall('balanceOf', [tokenAddress]) }
        // uncomment this to fetch balances for the particular block instead of latest
        // block.number
      ]))

      promises.push(nod3.batchRequest(batchRequest))
    }

    const tokenAddressesBalances = (await Promise.all(promises)).flat()

    // Set respective balances
    for (let i = 0; i < tokenAddresses.length; i++) {
      const tokenAddress = tokenAddresses[i]
      const tokenAddressBalance = tokenAddressesBalances[i]

      const TokenAddress = addresses[tokenAddress]
      TokenAddress.setTokenAddressBalance(contract.decodeCall('balanceOf', tokenAddressBalance).toHexString())
      data.push(TokenAddress.getData(true))
    }
    return data
  }
}
export default Contract

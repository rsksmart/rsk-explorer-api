import { BcThing } from './BcThing'
import ContractParser from '@rsksmart/rsk-contract-parser'
import { NULL_BALANCE, tokensInterfaces } from '../../lib/types'
import TokenAddress from './TokenAddress'
import { chunkArray } from '../../lib/utils'
import { hasValue } from '@rsksmart/rsk-utils'
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
    this.isProxy = false
    this.implementationAddress = undefined
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
          // fetch contract interfaces and methods
          if (!deployedCode) throw new Error(`Missing deployed code for contract: ${this.address}`)

          let { interfaces, methods } = await this.parser.getContractInfo(deployedCode, contract)

          if (!interfaces.length) { // possible proxy contract
            let { isUpgradeable, impContractAddress } = await this.parser.isERC1967(this.address)

            /***/
            // Workaround until rsk-contract-parser address validation is fixed
            const nullValue = '0x0000000000000000000000000000000000000000'
            if (impContractAddress === nullValue) isUpgradeable = false
            /***/

            // For proxy contracts, update contract parser and contract instance
            if (isUpgradeable) {
              this.isProxy = true
              this.implementationAddress = impContractAddress

              const proxyAddress = this.address
              const implementationABI = await this.getImplementationAbiFromVerification(impContractAddress)

              if (implementationABI) {
                // Verified implementations: update parser ABI and contract instance
                this.parser.setAbi(implementationABI)
                this.contract = this.parser.makeContract(proxyAddress, implementationABI)
              } else {
                // Unverified implementations: Use new parser with default abi. Update contract instance
                this.parser = this.createContractParser({ useDefaultAbi: true, txBlockNumber: this.block.number })
                this.contract = this.parser.makeContract(proxyAddress)
              }

              // Recheck EIP1967 info and set any implementation contract interfaces/methods to proxy contract
              const proxyCheckResult = await this.parser.getEIP1967Info(proxyAddress)

              if (proxyCheckResult && proxyCheckResult.interfaces.length) {
                interfaces = proxyCheckResult.interfaces
              }

              if (proxyCheckResult && proxyCheckResult.methods.length) {
                methods = proxyCheckResult.methods
              }
            }

            // Non proxy contracts: do nothing
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
      if (!this.parser) {
        let abi = await this.getAbi()
        this.parser = this.createContractParser({ abi, txBlockNumber })
      }
      return this.parser
    } catch (err) {
      return Promise.reject(err)
    }
  }

  createContractParser ({ useDefaultAbi, abi, txBlockNumber }) {
    const { nod3, initConfig, log } = this
    abi = useDefaultAbi ? undefined : abi

    return new ContractParser({ abi, nod3, initConfig, log, txBlockNumber })
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

  async getImplementationAbiFromVerification (address) {
    try {
      address = address || this.implementationAddress
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

  async fetchTokenAddressesBalances (blockNumber) {
    if (!this.fetched) await this.fetch()
    if (!this.isToken) return []
    const { addresses, address, contract, nod3 } = this

    const tokenAddresses = Object.keys(addresses)
    let tokenAddressesBalances = []
    const data = []

    // generate all batch requests
    try {
      for (const chunk of chunkArray(tokenAddresses, config.blocks.batchRequestSize)) {
        const batchRequest = chunk.map(tokenAddress => ([
          'eth.call',
          { to: address, data: contract.encodeCall('balanceOf', [tokenAddress]) },
          // When no blockNumber is specified, latest balances will be fetched by default
          blockNumber
        ]))

        const result = await nod3.batchRequest(batchRequest)
        tokenAddressesBalances.push(result)
      }

      tokenAddressesBalances = tokenAddressesBalances.flat()
    } catch (err) {
      this.log.error(`Error fetching token addresses balances for contract ${this.address}, block: ${this.block.number}`)
      this.log.error(err)
      throw err
    }

    // Set respective balances
    for (let i = 0; i < tokenAddresses.length; i++) {
      const address = tokenAddresses[i]
      const balance = tokenAddressesBalances[i]
      const TokenAddress = addresses[address]
      const parsedBalance = balance === NULL_BALANCE ? NULL_BALANCE : contract.decodeCall('balanceOf', balance).toHexString()

      TokenAddress.setTokenAddressBalance(parsedBalance)
      data.push(TokenAddress.getData(true))
    }
    return data
  }
}
export default Contract

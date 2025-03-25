import { BcThing } from './BcThing'
import ContractParser from '@rsksmart/rsk-contract-parser'
import { NULL_BALANCE, tokensInterfaces } from '../../lib/types'
import TokenAddress from './TokenAddress'
import { chunkArray } from '../../lib/utils'
import { isNativeContract } from '../../lib/NativeContracts'
import config from '../../lib/config'
import { verificationResultsRepository } from '../../repositories'

class Contract extends BcThing {
  constructor (address, deployedCode, { dbData, nod3, log, initConfig, block = { number: null } }) {
    super({ nod3, initConfig })
    if (!this.isAddress(address)) throw new Error(`Contract: invalid address ${address}`)
    this.address = address
    this.deployedCode = deployedCode
    this.data = {
      address,
      type: null,
      isNative: false,
      balance: null,
      blockNumber: null,
      contractInterfaces: [],
      contractMethods: [],
      name: null,
      symbol: null,
      decimals: null,
      totalSupply: null
    }
    this.addresses = {}
    this.fetched = false
    // Default parser instance. Uses default ABI
    this.parser = new ContractParser({ nod3, initConfig, log, txBlockNumber: block.number })
    this.contract = this.parser.makeContract(address)

    this.isToken = false
    this.isNative = isNativeContract(address)
    this.block = block
    if (dbData) this.setData(dbData)
  }

  async fetch () {
    try {
      if (this.fetched) return this.getData()

      // Prevent fetching for native contracts
      if (this.isNative) return this.getData()

      // Set contract parser
      const verifiedAbi = await this.getVerifiedAbiFromDatabase(this.address)
      this.setContractParser({
        txBlockNumber: this.block.number,
        abi: verifiedAbi
      })

      // Set contract instance
      this.setInteractiveContractInstance(this.address)

      const {
        isProxy,
        implementationAddress,
        methods: contractMethods,
        interfaces: contractInterfaces
      } = await this.parser.getContractDetails(this.address)

      // Normal contracts: Set contract interfaces and methods
      this.setData({ contractInterfaces, contractMethods })

      // Proxy contracts: Set the implementation contract methods and interfaces
      if (isProxy) {
        // Set the implementation abi for contract parser.
        // If no verified implementation abi is found, parser will use the default abi
        const verifiedImplementationAbi = await this.getVerifiedAbiFromDatabase(implementationAddress)

        this.setContractParser({
          txBlockNumber: this.block.number,
          abi: verifiedImplementationAbi
        })

        // Refresh interactive contract instance so it uses the proxy contract with the implementation abi
        const proxyAddress = this.address
        this.setInteractiveContractInstance(proxyAddress)

        // Get contract details for proxy contract using the implementation abi
        const { interfaces, methods } = await this.parser.getContractDetails(proxyAddress, this.block.number)
        this.setData({ contractInterfaces: interfaces, contractMethods: methods })
      }

      // Set token flag
      this.isToken = tokensInterfaces.some(i => this.data.contractInterfaces.includes(i))

      if (this.isToken) {
        // Get token data
        const tokenData = await this.getDefaultTokenData(this.block.number)
        this.setData(tokenData)
      }

      this.fetched = true
      return this.getData()
    } catch (err) {
      return Promise.reject(err)
    }
  }

  /**
   * Retrieves the contract parser instance
   * @returns {ContractParser} The contract parser instance
   */
  getParser () {
    return this.parser
  }

  /**
   * Retrieves the blockchain interactive contract instance
   */
  getContractInstance () {
    return this.contract
  }

  /**
   * Set the contract parser instance for a given address and block number. If no abi is provided, a default ABI will be used.
   * @param {Object} options
   * @param {number} options.txBlockNumber The block number of the transaction
   * @param {any[]} options.abi The ABI of the contract
   */
  setContractParser ({ txBlockNumber, abi } = {}) {
    this.parser = new ContractParser({
      abi,
      nod3: this.nod3,
      initConfig: this.initConfig,
      log: this.log,
      txBlockNumber
    })
  }

  /**
   * Sets the interactive contract instance. Useful for calling contract methods.
   * @param {string} address The target contract address
   */
  setInteractiveContractInstance (address) {
    const { parser } = this
    if (!parser) throw new Error('setInteractiveContractInstance(): Set contract parser first')

    this.contract = parser.makeContract(address)
  }

  /**
   * Retrieves the verified ABI for a given address
   * @param {string} address The address of the contract
   * @returns {Promise<any[] | null>} The verified ABI
   */
  async getVerifiedAbiFromDatabase (address) {
    try {
      const data = await verificationResultsRepository.findOne({ address, match: true })
      if (!data || !data.abi) return null

      return data.abi
    } catch (err) {
      return Promise.reject(err)
    }
  }

  /**
   * Get the token data for a given contract
   * @param {number?} blockNumber The specific block number to use for the call. Can be a block number or a tag. Defaults to tag 'latest'.
   * @returns {Promise<Object>} The token data
   */
  async getDefaultTokenData (blockNumber = 'latest') {
    return this.parser.getDefaultTokenData(this.contract, blockNumber)
  }

  addTokenAddress (address) {
    if (this.addresses[address]) return

    this.addresses[address] = new TokenAddress(address, this)
  }

  call (method, params = []) {
    let { contract, parser } = this
    if (!contract) throw new Error('Fetch first')
    return parser.call(contract, method, params)
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

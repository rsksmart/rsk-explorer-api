import SolidityEvent from 'web3/lib/web3/event.js'
import compiledAbi from './Abi'
import { web3 } from '../web3Connect'
import { contractsInterfaces } from '../types'
import interfacesIds from './interfacesIds'
import { includesAll } from '../../lib/utils'
import remascEvents from './RemascEvents'
import {
  ABI_SIGNATURE,
  setAbi,
  abiEvents,
  removeAbiSignaureData,
  abiSignatureData,
  soliditySelector,
  soliditySignature
} from './lib'

export class ContractParser {
  constructor ({ abi, log, nativeContracts } = {}) {
    if (!nativeContracts) throw new Error('Missing native contracts')
    this.abi = null
    this.abi = setAbi(abi || compiledAbi)
    this.eventsAbi = abiEvents(this.abi)
    this.web3 = web3
    this.log = log || console
    this.nativeContracts = nativeContracts
  }

  getRemascAddress () {
    const { nativeContracts } = this
    if (nativeContracts) {
      return nativeContracts.getNativeContractAddress('remasc')
    }
  }

  setAbi (abi) {
    this.abi = setAbi(abi)
    this.eventsAbi = abiEvents(this.abi)
  }

  setWeb3 (web3) {
    if (web3) this.web3 = web3
  }
  getMethodsSelectors () {
    let selectors = {}
    let methods = this.getAbiMethods()
    for (let m in methods) {
      let method = methods[m]
      let signature = method.signature || soliditySignature(m)
      selectors[m] = soliditySelector(signature)
    }
    return selectors
  }

  getAbiMethods () {
    let methods = {}
    this.abi.filter(def => def.type === 'function')
      .map(m => {
        let sig = m[ABI_SIGNATURE] || abiSignatureData(m)
        sig.name = m.name
        methods[sig.method] = sig
      })
    return methods
  }

  parseTxLogs (logs) {
    return logs.map(log => {
      // non-standard remasc events
      const remascAddress = this.getRemascAddress()
      if (log.address === remascAddress) return remascEvents.decode(log)

      let back = Object.assign({}, log)
      let decoder = this.getLogDecoder(log.topics || [])
      let decoded = (decoder) ? decoder.event.decode(log) : log
      decoded.topics = back.topics
      decoded.data = back.data
      if (decoder) {
        let signature = Object.assign({}, decoder.abi[ABI_SIGNATURE])
        decoded.signature = signature.signature
        decoded.abi = removeAbiSignaureData(decoder.abi)
        // convert args object to array to remove properties names
        if (decoded.args) {
          let inputs = decoded.abi.inputs || []
          let args = inputs.map(i => i.name).map(i => decoded.args[i])
          decoded.args = args
        }
      }
      return decoded
    }).map(log => {
      let abi = log.abi
      if (abi && abi.inputs) {
        abi.inputs.forEach(param => {
          if (param.type === 'bytes32') {
            log.args[param.name] = this.web3.toAscii(log.args[param.name])
          }
        })
      }
      return log
    })
  }

  getLogDecoder (topics) {
    if (!topics.length) return null
    let events = this.eventsAbi
    let signature = topics[0].slice(2)
    let indexed = topics.length - 1
    let decoders = events
      .filter(e => {
        let s = e[ABI_SIGNATURE]
        return s.signature === signature && s.indexed === indexed
      })
    if (decoders.length) {
      if (decoders[1]) this.log.error(`ERROR, dupplicated event: ${decoders[0].name}`)
      return this.createLogDecoder(decoders[0])
    }
  }

  createLogDecoder (abi) {
    abi = Object.assign({}, abi)
    const event = new SolidityEvent(null, abi, null)
    return { abi, event }
  }

  makeContract (address, abi) {
    abi = abi || this.abi
    return this.web3.eth.contract(abi).at(address)
  }

  call (method, contract, params = []) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(params)) reject(new Error(`Params must be an array`))
      contract[method].call(...params, (err, res) => {
        if (err !== null) {
          this.log.warn(`Method ${method} call ${err}`)
          resolve(null)
          // return reject(err)
        } else {
          resolve(res)
        }
      })
    })
  }

  async getTokenData (contract) {
    const methods = ['name', 'symbol', 'decimals', 'totalSupply']
    let [name, symbol, decimals, totalSupply] = await Promise.all(
      methods.map(m =>
        this.call(m, contract)
          .then(res => res)
          .catch(err => this.log.debug(`[${contract.address}] Error executing ${m}  Error: ${err}`)))
    )
    return { name, symbol, decimals, totalSupply }
  }

  hasMethodSelector (txInputData, selector) {
    return (selector && txInputData) ? txInputData.includes(selector) : null
  }

  getMethodsBySelectors (txInputData) {
    let methods = this.getMethodsSelectors()
    return Object.keys(methods)
      .filter(method => this.hasMethodSelector(txInputData, methods[method]) === true)
  }

  async getContractInfo (txInputData, contract) {
    let methods = this.getMethodsBySelectors(txInputData)
    let isErc165 = false
    //  skip non-erc165 conrtacts
    if (includesAll(methods, ['supportsInterface(bytes4)'])) {
      isErc165 = await this.implementsErc165(contract)
    }
    let interfaces
    if (isErc165) interfaces = await this.getInterfacesERC165(contract)
    else interfaces = this.getInterfacesByMethods(methods)
    interfaces = Object.keys(interfaces)
      .filter(k => interfaces[k] === true)
      .map(t => contractsInterfaces[t] || t)
    return { methods, interfaces }
  }

  async getInterfacesERC165 (contract) {
    let ifaces = {}
    let keys = Object.keys(interfacesIds)
    for (let i of keys) {
      ifaces[i] = await this.supportsInterface(contract, interfacesIds[i].id)
    }
    return ifaces
  }

  getInterfacesByMethods (methods, isErc165) {
    return Object.keys(interfacesIds)
      .map(i => {
        return [i, includesAll(methods, interfacesIds[i].methods)]
      })
      .reduce((obj, value) => {
        obj[value[0]] = value[1]
        return obj
      }, {})
  }

  async supportsInterface (contract, interfaceId) {
    // fixed gas to prevent infinite loops
    let options = { gas: 30000 }
    let res = await this.call('supportsInterface', contract, [interfaceId, options])
    return res
  }

  async implementsErc165 (contract) {
    try {
      let first = await this.supportsInterface(contract, interfacesIds.ERC165.id)
      if (first === true) {
        let second = await this.supportsInterface(contract, '0xffffffff')
        return !(second === true || second === null)
      }
      return false
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

export default ContractParser

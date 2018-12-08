import SolidityEvent from 'web3/lib/web3/event.js'
import compiledAbi from './Abi'
import { web3 } from '../web3Connect'
import { contractsTypes } from '../types'
import interfacesIds from './interfacesIds'
import { hasValues } from '../../lib/utils'

import {
  ABI_SIGNATURE,
  setAbi,
  removeAbiSignaureData,
  abiSignatureData,
  soliditySelector,
  soliditySignature
} from './lib'
export class ContractParser {
  constructor (abi, options = {}) {
    this.abi = null
    this.abi = setAbi(abi || compiledAbi)
    this.web3 = web3
    this.log = options.logger || console
  }

  setAbi (abi) {
    this.abi = setAbi(abi)
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
    const abi = this.abi
    let decoders = abi.filter(def => def.type === 'event')
      .map(def => {
        return { abi: def, event: new SolidityEvent(null, def, null) }
      })

    return logs.map(log => {
      let back = Object.assign({}, log)
      let decoder = decoders.find(decoder => {
        if (!log.topics.length) return false
        return (decoder.event.signature() === log.topics[0].slice(2))
      })
      let decoded = (decoder) ? decoder.event.decode(log) : log

      decoded.topics = back.topics
      decoded.data = back.data
      if (decoder) decoded.abi = removeAbiSignaureData(decoder.abi)
      return decoded
    }).map(log => {
      // Hmm review
      let abis = abi.find(def => {
        return (def.type === 'event' && log.event === def.name)
      })
      if (abis && abis.inputs) {
        abis.inputs.forEach(param => {
          if (param.type === 'bytes32') {
            log.args[param.name] = this.web3.toAscii(log.args[param.name])
          }
        })
      }
      return log
    })
  }

  makeContract (address, abi) {
    abi = abi || this.abi
    return this.web3.eth.contract(abi).at(address)
  }
  call (method, contract, params) {
    return new Promise((resolve, reject) => {
      contract[method].call(params, (err, res) => {
        if (err !== null) {
          resolve(null)
          this.log.warn(err)
          return reject(err)
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
    return (selector) ? txInputData.includes(selector) : null
  }

  getMethodsBySelectors (txInputData) {
    let methods = this.getMethodsSelectors()
    return Object.keys(methods)
      .filter(method => this.hasMethodSelector(txInputData, methods[method]) === true)
  }

  async getContractInfo (txInputData, contract) {
    let methods = this.getMethodsBySelectors(txInputData)
    let isErc165 = await this.implementsErc165(contract)
    let interfaces
    if (isErc165) interfaces = await this.getInterfacesERC165(contract)
    else interfaces = this.getInterfacesByMethods(methods)
    interfaces = Object.keys(interfaces)
      .filter(k => interfaces[k] === true)
      .map(t => contractsTypes[t] || t)
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
        return [i, hasValues(methods, interfacesIds[i].methods)]
      })
      .reduce((obj, value) => {
        obj[value[0]] = value[1]
        return obj
      }, {})
  }

  async supportsInterface (contract, interfaceId) {
    let res = await this.call('supportsInterface', contract, interfaceId)
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

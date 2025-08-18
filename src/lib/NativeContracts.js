import { getLatestBridgeMethods } from '@rsksmart/rsk-contract-parser'
import { isAddress } from './utils'

export const nativeContracts = {
  bridge: '0x0000000000000000000000000000000001000006',
  remasc: '0x0000000000000000000000000000000001000008'
}

export const getNativeContractAddress = contractName => nativeContracts[contractName]

export const getNativeContractName = address => Object.keys(nativeContracts).find(name => nativeContracts[name] === address)

export const isNativeContract = address => !!getNativeContractName(address)

export const getNativeContractMethods = address => {
  if (address === nativeContracts.bridge) {
    return getLatestBridgeMethods()
  }

  if (address === nativeContracts.remasc) {
    return []
  }

  return []
}

export const getNativeContractInterfaces = (address) => {
  if (address === nativeContracts.bridge) {
    return []
  }

  if (address === nativeContracts.remasc) {
    return []
  }

  return []
}

export const NativeContracts = Object.freeze({
  getNativeContractAddress,
  getNativeContractName,
  isNativeContract,
  getNativeContractMethods,
  getNativeContractInterfaces
})

export function validateNativeContracts () {
  for (let contract in nativeContracts) {
    const address = nativeContracts[contract]
    if (!isAddress(address)) throw new Error(`Invalid address ${address}, contract: ${contract}`)
  }
}

export function NativeContracts ({ nativeContracts } = {}) {
  if (!nativeContracts) return null
  const names = Object.keys(nativeContracts)

  const getNativeContractAddress = contractName => {
    return nativeContracts[contractName]
  }
  const getNativeContractName = address => {
    return names.find(name => nativeContracts[name] === address)
  }

  const isNativeContract = address => getNativeContractName(address)

  return Object.freeze({ getNativeContractAddress, getNativeContractName, isNativeContract })
}

export default NativeContracts

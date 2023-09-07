import { removeNullFields } from '../repositories/utils'
import { blockEntityToRaw } from './blocks.converters'
import config from '../lib/initialConfiguration'
import NativeContracts from '../lib/NativeContracts'

const { isNativeContract } = NativeContracts({ nativeContracts: config.nativeContracts })

function rawAddressToEntity ({
  address,
  isNative,
  type
}) {
  return {
    address,
    isNative,
    type
  }
}

function rawContractToEntity ({
  address,
  name,
  code,
  codeStoredAtBlock,
  deployedCode,
  symbol,
  decimals
}) {
  const contractToReturn = {
    address,
    name,
    code,
    codeStoredAtBlock,
    deployedCode,
    symbol,
    decimals
  }

  return contractToReturn
}

function addressEntityToRaw ({
  address,
  address_latest_balance_address_latest_balance_addressToaddress: latestBalance,
  isNative,
  miner_miner_addressToaddress: lastBlockMined,
  contract_contract_addressToaddress: contract,
  type
}, {
  isForGetCode
} = {}) {
  let addressToReturn

  if (isForGetCode) {
    const { address, code, createdByTx, contractInterfaces, name } = contractEntityToRaw(contract)
    addressToReturn = { address, code, createdByTx, contractInterfaces, name }
  } else {
    addressToReturn = {
      address,
      balance: latestBalance.balance,
      blockNumber: latestBalance.blockNumber,
      isNative,
      type
    }

    if (lastBlockMined[0]) {
      addressToReturn.lastBlockMined = blockEntityToRaw(lastBlockMined[0].block)
    }

    if (contract) {
      Object.assign(addressToReturn, contractEntityToRaw(contract))
    }
  }

  return removeNullFields(addressToReturn, ['name'])
}

function contractEntityToRaw ({
  address,
  name,
  contract_creation_tx: createdByTx,
  code,
  codeStoredAtBlock,
  deployedCode,
  symbol,
  total_supply: totalSupply,
  decimals,
  contract_method: methods,
  contract_interface: interfaces
}, {
  isForGetTokens
} = {}) {
  const contractToReturn = {
    address,
    name,
    codeStoredAtBlock,
    code,
    deployedCode,
    symbol,
    decimals
  }

  if (isForGetTokens) {
    delete contractToReturn.code
  }

  if (createdByTx) {
    contractToReturn.createdByTx = JSON.parse(createdByTx.tx)
  }

  if (!isNativeContract(address)) {
    contractToReturn.contractMethods = methods.map(method => method.method)
  }

  if (interfaces && interfaces.length) {
    contractToReturn.contractInterfaces = interfaces.map(interface_ => interface_.interface)
  }

  if (totalSupply[0]) {
    contractToReturn.totalSupply = totalSupply[0].totalSupply
  }

  return removeNullFields(contractToReturn, ['name', 'code'])
}
export {
  rawAddressToEntity,
  rawContractToEntity,
  addressEntityToRaw,
  contractEntityToRaw
}

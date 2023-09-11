import { removeNullFields } from '../repositories/utils'
import { blockEntityToRaw } from './blocks.converters'
import config from '../lib/initialConfiguration'
import NativeContracts from '../lib/NativeContracts'

const { isNativeContract } = NativeContracts({ nativeContracts: config.nativeContracts })

function rawAddressToEntity ({
  address,
  isNative,
  type,
  name
}) {
  return {
    address,
    isNative,
    type,
    name
  }
}

function rawContractToEntity ({
  address,
  code,
  codeStoredAtBlock,
  deployedCode,
  symbol,
  decimals
}) {
  const contractToReturn = {
    address,
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
  type,
  name
}, {
  isForGetCode,
  deleteCodeAndInput
} = {}) {
  let addressToReturn

  if (isForGetCode) {
    const { address, code, createdByTx, contractInterfaces } = contractEntityToRaw(contract)
    addressToReturn = { address, code, createdByTx, contractInterfaces, name }
  } else {
    addressToReturn = {
      address,
      balance: latestBalance.balance === '0' ? '0x0' : latestBalance.balance,
      blockNumber: latestBalance.blockNumber,
      isNative,
      type,
      name
    }

    if (lastBlockMined[0]) {
      addressToReturn.lastBlockMined = blockEntityToRaw(lastBlockMined[0].block)
    }

    if (contract) {
      Object.assign(addressToReturn, contractEntityToRaw(contract))
    }
  }
  if (deleteCodeAndInput) {
    delete addressToReturn.code
    if (addressToReturn.createdByTx) delete addressToReturn.createdByTx.input
  }

  return removeNullFields(addressToReturn, ['name'])
}

function contractEntityToRaw ({
  address,
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

  return removeNullFields(contractToReturn, ['code'])
}
export {
  rawAddressToEntity,
  rawContractToEntity,
  addressEntityToRaw,
  contractEntityToRaw
}

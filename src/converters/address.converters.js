import { removeNullFields } from '../repositories/utils'
import { blockEntityToRaw } from './block.converters'

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
  createdByTx,
  createdByInternalTx,
  code,
  codeStoredAtBlock,
  deployedCode,
  symbol,
  totalSupply,
  decimals
}) {
  const contractToReturn = {
    address,
    name,
    code,
    codeStoredAtBlock,
    deployedCode,
    symbol,
    totalSupply,
    decimals
  }

  if (createdByTx) {
    if (createdByTx.transactionHash) {
      contractToReturn.createdByInternalTx = createdByTx.transactionHash
    } else if (createdByTx.hash) {
      contractToReturn.createdByTx = createdByTx.hash
    }
  } else if (createdByInternalTx) {
    contractToReturn.createdByInternalTx = createdByInternalTx
  }

  return contractToReturn
}

function addressEntityToRaw ({
  address,
  balance_balance_addressToaddress: balance,
  isNative,
  miner_miner_addressToaddress: lastBlockMined,
  contract_contract_addressToaddress: contract,
  name,
  type
}) {
  const addressToReturn = {
    address,
    balance: balance[0].balance,
    blockNumber: balance[0].blockNumber,
    isNative,
    name,
    type
  }

  if (lastBlockMined[0]) {
    addressToReturn.lastBlockMined = blockEntityToRaw(lastBlockMined[0].block)
  }

  if (contract) {
    Object.assign(addressToReturn, contractEntityToRaw(contract))
  }

  return removeNullFields(addressToReturn, ['name'])
}

function contractEntityToRaw ({
  address,
  balance_balance_addressToaddress: balance,
  name,
  createdByTx,
  createdByInternalTx,
  code,
  codeStoredAtBlock,
  deployedCode,
  symbol,
  totalSupply,
  decimals,
  contract_method: methods,
  contract_interface: interfaces
}) {
  const contractToReturn = {
    address,
    name,
    createdByTx,
    createdByInternalTx,
    code,
    codeStoredAtBlock,
    deployedCode,
    symbol,
    totalSupply,
    decimals
  }

  if (methods) {
    contractToReturn.contractMethods = methods.map(method => method.method)
  }

  if (interfaces) {
    contractToReturn.contractInterfaces = interfaces.map(interface_ => interface_.interface)
  }

  return removeNullFields(contractToReturn, ['name', 'code'])
}
export {rawAddressToEntity, rawContractToEntity, addressEntityToRaw, contractEntityToRaw}

import { removeNullFields } from '../repositories/utils'
import { blockEntityToRaw } from './block.converters'

function rawAddressToEntity ({
  address,
  blockNumber,
  lastBlockMined,
  balance,
  isNative,
  type
}) {
  return {
    address,
    block: blockNumber,
    lastBlockMined: lastBlockMined ? lastBlockMined.number : null,
    balance,
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
  balance,
  block: blockNumber,
  isNative,
  block_address_last_block_minedToblock: lastBlockMined,
  contract_contract_addressToaddress: contract,
  name,
  type
}) {
  const addressToReturn = {
    address,
    balance,
    blockNumber,
    isNative,
    name,
    type
  }

  if (lastBlockMined) {
    delete lastBlockMined.id
    addressToReturn.lastBlockMined = blockEntityToRaw(lastBlockMined)
  }

  if (contract) {
    Object.assign(addressToReturn, contractEntityToRaw(contract))
  }

  return removeNullFields(addressToReturn, ['name'])
}

function contractEntityToRaw ({
  address,
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

  return removeNullFields(contractToReturn, ['name'])
}
export {rawAddressToEntity, rawContractToEntity, addressEntityToRaw, contractEntityToRaw}

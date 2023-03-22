import { removeNullFields } from '../repositories/utils'

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
  return {
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
    addressToReturn.lastBlockMined = lastBlockMined
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
    const contractMethods = methods.map(({method: {method}}) => method)
    contractToReturn.contractMethods = contractMethods
  }

  if (interfaces) {
    const contractInterfaces = interfaces.map(interface_ => interface_.interface_.interface)
    contractToReturn.contractInterfaces = contractInterfaces
  }

  return removeNullFields(contractToReturn)
}
export {rawAddressToEntity, rawContractToEntity, addressEntityToRaw, contractEntityToRaw}

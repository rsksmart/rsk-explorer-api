import { removeNullFields } from '../repositories/utils'
import { blockEntityToRaw } from './blocks.converters'
import { isNativeContract } from '../lib/NativeContracts'

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

function rawMinerAddressToEntity ({
  address,
  isNative,
  type,
  name,
  balance,
  blockNumber,
  lastBlockMined
}) {
  return {
    address,
    isNative,
    type,
    name,
    balance,
    blockNumber,
    lastBlockMined: JSON.stringify(lastBlockMined),
    lastBlockMinedNumber: lastBlockMined.number
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
  miner_address_miner_address_addressToaddress: miner,
  block, // for summary
  balance, // for summary
  blockNumber, // for summary
  contract_contract_addressToaddress: contract,
  contract_destruction_tx: destroyedByTx,
  type,
  name
}, {
  isForSummary,
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
      balance: isForSummary ? balance : (!latestBalance || latestBalance.balance === '0' ? '0x0' : latestBalance.balance),
      blockNumber: isForSummary ? blockNumber : (latestBalance ? latestBalance.blockNumber : 0),
      isNative,
      type,
      name
    }

    if (isForSummary) {
      if (block) {
        addressToReturn.lastBlockMined = blockEntityToRaw(block)
      }
    } else {
      if (miner) {
        addressToReturn.lastBlockMined = JSON.parse(miner.lastBlockMined)
      }
    }

    if (contract) {
      Object.assign(addressToReturn, contractEntityToRaw(contract))
    }
  }

  if (destroyedByTx) {
    addressToReturn.destroyedByTx = JSON.parse(destroyedByTx.tx)
  }

  if (deleteCodeAndInput) {
    delete addressToReturn.code
    if (addressToReturn.createdByTx) delete addressToReturn.createdByTx.input
  }

  return removeNullFields(addressToReturn, ['name'])
}

function minerAddressEntityToRaw ({
  address,
  isNative,
  type,
  name,
  balance,
  blockNumber,
  lastBlockMined
}) {
  return {
    address,
    isNative,
    type,
    name,
    balance,
    blockNumber,
    lastBlockMined: JSON.parse(lastBlockMined)
  }
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
  contractEntityToRaw,
  rawMinerAddressToEntity,
  minerAddressEntityToRaw
}

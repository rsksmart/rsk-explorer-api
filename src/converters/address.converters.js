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
    lastBlockMined: lastBlockMined ? lastBlockMined.blockNumber : null,
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

export {rawAddressToEntity, rawContractToEntity}

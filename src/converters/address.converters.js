function rawAddressToEntity (data) {
  const {lastBlockMined} = data
  return {
    address: data.address,
    block: data.blockNumber,
    last_block_mined: lastBlockMined ? lastBlockMined.blockNumber : null,
    balance: data.balance,
    is_native: data.isNative,
    type: data.typeId
  }
}

export {rawAddressToEntity}

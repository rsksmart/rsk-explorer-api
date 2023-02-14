function rawAddressToEntity (data) {
  const {lastBlockMined} = data
  return {
    address: data.address,
    block: data.blockNumber,
    lastBlockMined: lastBlockMined ? lastBlockMined.blockNumber : null,
    balance: data.balance,
    isNative: data.isNative,
    type: data.typeId
  }
}

export {rawAddressToEntity}

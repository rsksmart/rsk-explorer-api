function rawBalanceToEntity ({address, _created, timestamp, balance, blockHash, blockNumber}) {
  return {
    address,
    created: String(_created),
    timestamp: String(timestamp),
    balance,
    blockHash,
    blockNumber
  }
}

export { rawBalanceToEntity }

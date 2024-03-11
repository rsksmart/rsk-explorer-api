function rawTxPendingToEntity ({
  hash,
  blockHash,
  from,
  to,
  blockNumber,
  transactionIndex,
  nonce,
  gas,
  gasPrice,
  value,
  input,
  status
}) {
  return {
    hash,
    blockHash,
    from,
    to,
    blockNumber,
    transactionIndex,
    nonce,
    gas,
    gasPrice,
    value,
    input,
    status
  }
}

function rawTxInPoolToEntity (data) {
  return {
    ...rawTxPendingToEntity(data),
    poolId: data.poolId
  }
}

export { rawTxPendingToEntity, rawTxInPoolToEntity }

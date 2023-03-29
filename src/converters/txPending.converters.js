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

function rawTxPoolToEntity ({
  blockNumber,
  pending,
  queued,
  timestamp
}) {
  return {
    blockNumber,
    pending,
    queued,
    timestamp: String(timestamp)
  }
}

export {rawTxPendingToEntity, rawTxPoolToEntity, rawTxInPoolToEntity}

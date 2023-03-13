function rawTxPendingToEntity (data) {
  return {
    hash: data.hash,
    blockHash: data.blockHash,
    from: data.from,
    to: data.to,
    blockNumber: data.blockNumber,
    transactionIndex: data.transactionIndex,
    nonce: data.nonce,
    gas: data.gas,
    gasPrice: data.gasPrice,
    value: data.value,
    input: data.input,
    status: data.status
  }
}

function rawTxInPoolToEntity (data) {
  return {
    ...rawTxPendingToEntity(data),
    poolId: data.poolId
  }
}

function rawTxPoolToEntity (data) {
  return {
    blockNumber: data.blockNumber,
    pending: data.pending,
    queued: data.queued,
    timestamp: String(data.timestamp)
  }
}

export {rawTxPendingToEntity, rawTxPoolToEntity, rawTxInPoolToEntity}

export function rawTxPoolToEntity ({
  blockNumber,
  pending,
  queued,
  timestamp,
  txs
}) {
  return {
    blockNumber,
    pending,
    queued,
    timestamp,
    txs: JSON.stringify(txs)
  }
}

export function txPoolEntityToRaw ({
  id,
  blockNumber,
  pending,
  queued,
  timestamp,
  transaction_in_pool: poolTransactions
}) {
  return {
    blockNumber,
    pending,
    queued,
    timestamp: Number(timestamp),
    txs: [...poolTransactions]
  }
}

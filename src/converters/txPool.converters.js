export function rawTxPoolToEntity ({
  blockNumber,
  pending,
  queued,
  timestamp,
  datetime,
  txs
}) {
  return {
    blockNumber,
    pending,
    queued,
    timestamp,
    datetime,
    txs: JSON.stringify(txs)
  }
}

export function txPoolEntityToRaw ({
  id,
  blockNumber,
  pending,
  queued,
  timestamp,
  datetime,
  transaction_in_pool: poolTransactions
}) {
  return {
    blockNumber,
    pending,
    queued,
    timestamp: Number(timestamp),
    datetime,
    txs: [...poolTransactions]
  }
}

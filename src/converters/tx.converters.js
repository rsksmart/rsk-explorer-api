function rawTxToEntity ({
  hash,
  nonce,
  blockHash,
  blockNumber,
  transactionIndex,
  from,
  to,
  gas,
  gasPrice,
  value,
  input,
  v,
  r,
  s,
  type,
  timestamp,
  receipt,
  txType,
  txId
}) {
  return {
    hash,
    nonce,
    blockHash,
    blockNumber,
    transactionIndex,
    from,
    to: to || undefined,
    gas,
    gasPrice,
    value,
    input,
    v,
    r,
    s,
    type,
    timestamp,
    receipt: JSON.stringify(receipt),
    txType,
    txId
  }
}

function transactionEntityToRaw ({
  hash,
  nonce,
  blockHash,
  blockNumber,
  transactionIndex,
  from,
  to,
  gas,
  gasPrice,
  value,
  input,
  v,
  r,
  s,
  type,
  timestamp,
  receipt,
  txType,
  txId
}) {
  const txToReturn = {
    hash,
    nonce,
    blockHash,
    blockNumber,
    transactionIndex,
    from,
    to: to || null,
    gas,
    gasPrice,
    value,
    input,
    v,
    r,
    s,
    type,
    timestamp: Number(timestamp),
    receipt: JSON.parse(receipt),
    txType,
    txId
  }

  return txToReturn
}

export {
  rawTxToEntity,
  transactionEntityToRaw
}

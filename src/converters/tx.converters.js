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
  status,
  isSuccessful,
  receipt,
  txType,
  txId,
  datetime,
  date,
  gasUsed
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
    status,
    isSuccessful,
    receipt: JSON.stringify(receipt),
    txType,
    txId,
    datetime,
    date,
    gasUsed
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
  status,
  isSuccessful,
  txType,
  txId,
  datetime,
  date,
  gasUsed
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
    status,
    isSuccessful,
    receipt: JSON.parse(receipt || '{}'),
    txType,
    txId,
    datetime,
    date,
    gasUsed
  }

  return txToReturn
}

function rawReceiptToEntity (data) {
  const receiptEntity = {
    ...data,
    logs: JSON.stringify(data.logs)
  }

  return receiptEntity
}

export {
  rawTxToEntity,
  transactionEntityToRaw,
  rawReceiptToEntity
}

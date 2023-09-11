import { removeNullFields } from '../repositories/utils'

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
    timestamp: String(timestamp),
    txType,
    txId
  }
}

function rawReceiptToEntity ({
  transactionIndex,
  blockHash,
  blockNumber,
  logs,
  from,
  to,
  cumulativeGasUsed,
  gasUsed,
  contractAddress,
  status,
  logsBloom,
  type
}) {
  return {
    transactionIndex,
    blockHash,
    blockNumber,
    logs: JSON.stringify(logs),
    from,
    to: to || undefined,
    cumulativeGasUsed,
    gasUsed,
    contractAddress,
    status,
    logsBloom,
    type
  }
}

function receiptEntityToRaw ({
  transactionHash,
  transactionIndex,
  blockHash,
  blockNumber,
  from,
  to,
  type,
  cumulativeGasUsed,
  gasUsed,
  contractAddress,
  status,
  logsBloom,
  logs
}) {
  const receiptToReturn = {
    transactionHash,
    transactionIndex,
    blockHash,
    blockNumber,
    cumulativeGasUsed,
    gasUsed,
    contractAddress,
    logs: JSON.parse(logs),
    from,
    to,
    status,
    logsBloom,
    type
  }

  return removeNullFields(receiptToReturn, ['contractAddress', 'to'])
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
    txType,
    txId
  }

  if (receipt) {
    txToReturn.receipt = receiptEntityToRaw(receipt)
  }
  return txToReturn
}

export {
  rawTxToEntity,
  rawReceiptToEntity,
  transactionEntityToRaw
}

function rawActionToEntity ({
  id,
  callType,
  creationMethod,
  from,
  to,
  gas,
  input,
  value,
  address,
  refundAddress,
  balance
}) {
  return {
    id,
    callType,
    creationMethod,
    from,
    to,
    gas,
    input,
    value,
    address,
    refundAddress,
    balance
  }
}

function rawInternalTransactionResultToEntity ({
  id,
  address,
  gasUsed,
  output
}) {
  return {
    id,
    address,
    gasUsed,
    output
  }
}

function rawInternalTransactionToEntity ({
  internalTxId,
  transactionHash,
  blockNumber,
  blockHash,
  actionId,
  resultId,
  transactionPosition,
  subtraces,
  _index,
  timestamp,
  type
}) {
  return {
    internalTxId,
    transactionHash,
    blockNumber,
    blockHash,
    actionId,
    resultId,
    transactionPosition,
    subtraces,
    index: _index,
    timestamp: String(timestamp),
    type
  }
}

export {rawActionToEntity, rawInternalTransactionResultToEntity, rawInternalTransactionToEntity}

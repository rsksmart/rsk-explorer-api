import { removeNullFields } from '../repositories/utils'

function rawInternalTransactionToEntity ({
  internalTxId,
  transactionHash,
  blockNumber,
  blockHash,
  transactionPosition,
  subtraces,
  traceAddress,
  result,
  action,
  _index,
  timestamp,
  type,
  error
}) {
  return {
    internalTxId,
    transactionHash,
    blockNumber,
    blockHash,
    transactionPosition,
    subtraces,
    traceAddress: JSON.stringify(traceAddress),
    result: result ? JSON.stringify(result) : null,
    action: JSON.stringify(action),
    index: _index,
    timestamp,
    type,
    error
  }
}

function internalTxEntityToRaw ({
  timestamp,
  blockHash,
  blockNumber,
  transactionHash,
  transactionPosition,
  subtraces,
  traceAddress,
  result,
  action,
  index,
  type,
  internalTxId,
  error
}) {
  const itxToReturn = {
    action: removeNullFields(JSON.parse(action)),
    blockHash,
    blockNumber,
    transactionHash,
    transactionPosition,
    type,
    subtraces,
    traceAddress: JSON.parse(traceAddress),
    result: removeNullFields(JSON.parse(result)),
    _index: index,
    timestamp: Number(timestamp),
    internalTxId
  }

  if (error) itxToReturn.error = error

  return itxToReturn
}

export {
  rawInternalTransactionToEntity,
  internalTxEntityToRaw
}

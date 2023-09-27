import { removeNullFields } from '../repositories/utils'

function rawActionToEntity ({
  internalTxId,
  callType,
  creationMethod,
  from,
  to,
  gas,
  input,
  value,
  init,
  address,
  refundAddress,
  balance
}) {
  return {
    internalTxId,
    callType,
    creationMethod,
    from,
    to,
    gas,
    input,
    value,
    init,
    address,
    refundAddress,
    balance
  }
}

function rawInternalTransactionResultToEntity ({
  gasUsed,
  output,
  address,
  code
}) {
  return {
    gasUsed,
    output,
    address,
    code
  }
}

function rawInternalTransactionToEntity ({
  internalTxId,
  transactionHash,
  blockNumber,
  blockHash,
  transactionPosition,
  subtraces,
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
    index: _index,
    timestamp: String(timestamp),
    type,
    error
  }
}

function rawTraceAddressToEntity (trace, index) {
  return { trace, index }
}

function internalTxEntityToRaw ({
  timestamp,
  blockHash,
  blockNumber,
  transactionHash,
  transactionPosition,
  subtraces,
  trace_address: traceAddress,
  index,
  internal_transaction_result: result,
  action,
  type,
  internalTxId,
  error
}) {
  delete action.internalTxId
  delete result.internalTxId

  const itxToReturn = {
    action: removeNullFields(action),
    blockHash,
    blockNumber,
    transactionHash,
    transactionPosition,
    type,
    subtraces,
    traceAddress: traceAddress.map(t => t.trace),
    result: removeNullFields(result),
    _index: index,
    timestamp: Number(timestamp),
    internalTxId
  }

  if (error) {
    itxToReturn.error = error
  }

  if (!Object.keys(result).length) {
    itxToReturn.result = null
  }

  return itxToReturn
}

export {
  rawActionToEntity,
  rawInternalTransactionResultToEntity,
  rawInternalTransactionToEntity,
  internalTxEntityToRaw,
  rawTraceAddressToEntity
}

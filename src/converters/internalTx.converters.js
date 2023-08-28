// import { removeNullFields } from '../repositories/utils'

function rawActionToEntity ({
  internalTxId,
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
    internalTxId,
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
  address,
  gasUsed,
  output
}) {
  return {
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
    transactionPosition,
    subtraces,
    index: _index,
    timestamp: String(timestamp),
    type
  }
}

function rawTraceAddressToEntity (trace, index) {
  return { trace, index }
}

function internalTxEntityToRaw ({
  timestamp,
  trace_address: traceAddress,
  index,
  internal_transaction_result: result,
  action,
  type
}) {
  delete action.internalTxId
  delete result.internalTxId

  return {
    timestamp: Number(timestamp),
    traceAddress: traceAddress.map(t => t.trace),
    _index: index,
    result,
    action,
    type
  }
}

export {
  rawActionToEntity,
  rawInternalTransactionResultToEntity,
  rawInternalTransactionToEntity,
  internalTxEntityToRaw,
  rawTraceAddressToEntity
}

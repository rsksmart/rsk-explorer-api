import { removeNullFields } from '../repositories/utils'

function rawActionToEntity ({
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
  action
}) {
  return removeNullFields({
    timestamp,
    traceAddress,
    _index: index,
    result,
    action
  })
}

export {
  rawActionToEntity,
  rawInternalTransactionResultToEntity,
  rawInternalTransactionToEntity,
  internalTxEntityToRaw,
  rawTraceAddressToEntity
}

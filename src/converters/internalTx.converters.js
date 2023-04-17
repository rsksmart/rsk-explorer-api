import { removeNullFields } from '../repositories/utils'

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

function internalTxEntityToRaw ({
  timestamp,
  trace_address: traceAddress,
  index,
  internal_transaction_result: result,
  action
}) {

  if (result) {
    delete result.id
  }
  if (action) {
    delete action.id
  }

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
  internalTxEntityToRaw
}

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

function internalTxEntityToRaw (data) {
  // rename or format attributes
  data.timestamp = Number(data.timestamp)

  data.traceAddress = data.trace_address.map(elem => elem.trace)
  delete data.trace_address

  data._index = data.index
  delete data.index

  data.result = data.internal_transaction_result
  delete data.internal_transaction_result

  // delete ids
  delete data.resultId
  delete data.actionId

  // delete related tables ids
  delete data.action.id
  if (data.result) delete data.result.id

  // remove null fields
  removeNullFields(data)

  return data
}

export {
  rawActionToEntity,
  rawInternalTransactionResultToEntity,
  rawInternalTransactionToEntity,
  internalTxEntityToRaw
}

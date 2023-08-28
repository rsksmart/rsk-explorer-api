import { abiEntityToRaw } from './abi.converters'
import { removeNullFields } from '../repositories/utils'

function rawTxToEntity ({
  hash,
  txId,
  txType,
  type,
  from,
  to,
  blockNumber,
  blockHash,
  transactionIndex,
  nonce,
  gas,
  gasPrice,
  value,
  input,
  v,
  r,
  s,
  timestamp
}) {
  return {
    hash,
    txId,
    txType,
    from,
    to: to || undefined,
    blockNumber,
    blockHash,
    transactionIndex,
    nonce,
    gas,
    gasPrice,
    value,
    input,
    v,
    r,
    s,
    type,
    timestamp: String(timestamp)
  }
}

function rawReceiptToEntity ({
  transactionHash,
  transactionIndex,
  blockHash,
  blockNumber,
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
    transactionHash,
    transactionIndex,
    blockHash,
    blockNumber,
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

function rawLogToEntity ({
  logIndex,
  transactionHash,
  transactionIndex,
  blockNumber,
  blockHash,
  address,
  abiId: abi,
  data,
  signature,
  event,
  timestamp,
  txStatus,
  eventId
}) {
  return {
    logIndex,
    transactionHash,
    transactionIndex,
    blockNumber,
    blockHash,
    address,
    abi,
    data,
    signature,
    event,
    timestamp: String(timestamp),
    txStatus,
    eventId
  }
}

function rawLogTopicToEntity ({
  logIndex,
  transactionHash,
  topic,
  topicIndex
}) {
  return {
    logIndex,
    transactionHash,
    topic,
    topicIndex
  }
}

function rawLogArgToEntity ({
  logIndex,
  transactionHash,
  arg
}) {
  return {
    logIndex,
    transactionHash,
    arg: JSON.stringify(arg)
  }
}

function rawLoggedAddressToEntity ({
  logIndex,
  transactionHash,
  address
}) {
  return {
    logIndex,
    transactionHash,
    address
  }
}

function logEntityToRaw ({
  logIndex,
  transactionHash,
  transactionIndex,
  blockNumber,
  blockHash,
  address,
  data,
  signature,
  event,
  timestamp,
  txStatus,
  eventId,
  abi_log_abiToabi: abi,
  log_topic: topics,
  log_arg: args,
  logged_address: _addresses
}) {
  const logToReturn = {
    logIndex,
    transactionHash,
    transactionIndex,
    blockNumber,
    blockHash,
    address,
    abi: abiEntityToRaw(abi),
    data,
    signature,
    event,
    timestamp: Number(timestamp),
    txStatus,
    eventId,
    _addresses: _addresses.map(({address}) => address),
    topics: topics.map(({topic}) => topic)
  }

  if (args.length > 0) {
    logToReturn.args = args.map(({arg}) => JSON.parse(arg))
  }

  return removeNullFields(logToReturn, ['event'])
}

function receiptEntityToRaw ({
  transactionHash,
  transactionIndex,
  blockHash,
  blockNumber,
  from,
  to,
  cumulativeGasUsed,
  gasUsed,
  contractAddress,
  status,
  logsBloom,
  type,
  log
}) {
  const receiptToReturn = {
    transactionHash,
    transactionIndex,
    blockHash,
    blockNumber,
    from,
    to,
    logs: log.map(logEntityToRaw),
    cumulativeGasUsed,
    gasUsed,
    contractAddress,
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
  rawLogToEntity,
  rawLogTopicToEntity,
  rawLogArgToEntity,
  rawLoggedAddressToEntity,
  transactionEntityToRaw
}

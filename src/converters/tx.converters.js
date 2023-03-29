import { removeNullFields } from '../repositories/utils'

function rawTxToEntity ({
  hash,
  txId,
  txType,
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
  logsBloom
}) {
  return {
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
    logsBloom
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
  topic
}) {
  return {
    logIndex,
    transactionHash,
    topic
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
    arg
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

function abiEntityToRaw ({
  anonymous,
  name,
  type,
  abi_input: inputs
}) {
  const abiToReturn = {
    anonymous,
    name,
    type,
    inputs: inputs.map(({input}) => input)
  }

  return removeNullFields(abiToReturn)
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
    timestamp,
    txStatus,
    eventId,
    _addresses: _addresses.map(({address}) => address),
    topics: topics.map(({topic}) => topic)
  }

  if (args.length > 0) {
    logToReturn.args = args.map(({arg}) => arg)
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
    logsBloom
  }

  return removeNullFields(receiptToReturn, ['contractAddress'])
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
    to,
    gas,
    gasPrice,
    value,
    input,
    v,
    r,
    s,
    timestamp,
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

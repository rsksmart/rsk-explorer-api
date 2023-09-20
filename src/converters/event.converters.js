import { removeNullFields } from '../repositories/utils'

function rawEventToEntity ({
  eventId,
  abi,
  address,
  args,
  topics,
  blockHash,
  blockNumber,
  data,
  event,
  logIndex,
  signature,
  timestamp,
  transactionHash,
  transactionIndex,
  txStatus
}) {
  return {
    eventId,
    abi: JSON.stringify(abi),
    address,
    args: JSON.stringify(args),
    topics: JSON.stringify(topics || []),
    blockHash,
    blockNumber,
    data,
    event,
    logIndex,
    signature,
    timestamp: String(timestamp),
    transactionHash,
    transactionIndex,
    txStatus
  }
}

function eventEntityToRaw ({
  eventId,
  abi,
  address,
  args,
  topics,
  blockHash,
  blockNumber,
  data,
  event,
  logIndex,
  signature,
  timestamp,
  transactionHash,
  transactionIndex,
  txStatus,
  address_in_event: _addresses
}) {
  const eventToReturn = {
    eventId,
    address,
    args: JSON.parse(args),
    blockHash,
    blockNumber,
    data,
    event,
    logIndex,
    signature,
    timestamp: Number(timestamp),
    transactionHash,
    transactionIndex,
    txStatus,
    topics: JSON.parse(topics),
    _addresses: _addresses.map(({ address }) => address)
  }

  if (abi) {
    eventToReturn.abi = JSON.parse(abi)
  }

  return removeNullFields(eventToReturn, ['event'])
}

export {rawEventToEntity, eventEntityToRaw}

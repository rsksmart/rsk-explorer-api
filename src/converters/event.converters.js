import { removeNullFields } from '../repositories/utils'

function rawEventToEntity ({
  eventId,
  abi,
  address,
  args,
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
  event_topic: topics,
  address_in_event: _addresses
}) {
  const eventToReturn = {
    eventId,
    abi: JSON.parse(abi),
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
    topics: topics.map(({ topic }) => topic),
    _addresses: _addresses.map(({ address }) => address)
  }

  return removeNullFields(eventToReturn, ['event'])
}

export {rawEventToEntity, eventEntityToRaw}

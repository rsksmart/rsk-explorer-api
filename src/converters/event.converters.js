import { removeNullFields } from '../repositories/utils'
import { abiEntityToRaw } from './abi.converters'

function rawEventToEntity ({
  eventId,
  abiId,
  address,
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
    abiId,
    address,
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
  address,
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
  event_arg: args,
  event_topic: topics,
  address_in_event: _addresses,
  abi
}) {
  const eventToReturn = {
    eventId,
    address,
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
    topics: topics.map(({topic}) => topic),
    _addresses: _addresses.map(({address}) => address),
    abi: abiEntityToRaw(abi)
  }

  if (args.length) {
    eventToReturn.args = args.map(({arg}) => JSON.parse(arg))
  }

  return removeNullFields(eventToReturn, ['event'])
}

export {rawEventToEntity, eventEntityToRaw}

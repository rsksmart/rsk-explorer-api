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
  const topic0 = topics[0] || null
  const topic1 = topics[1] || null
  const topic2 = topics[2] || null
  const topic3 = topics[3] || null

  return {
    eventId,
    abi: JSON.stringify(abi),
    address,
    args: JSON.stringify(args),
    topic0,
    topic1,
    topic2,
    topic3,
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
  }
}

function eventEntityToRaw ({
  eventId,
  abi,
  address,
  args,
  topic0,
  topic1,
  topic2,
  topic3,
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
  address_in_event: involvedAddresses
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
    topics: [topic0, topic1, topic2, topic3].filter(Boolean)
  }

  if (involvedAddresses) {
    eventToReturn._addresses = involvedAddresses.filter(a => !a.isEventEmitterAddress).map(a => a.address)
  }

  if (abi) {
    eventToReturn.abi = JSON.parse(abi)
  }

  return removeNullFields(eventToReturn, ['event'])
}

export {rawEventToEntity, eventEntityToRaw}

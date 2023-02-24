function rawTxToEntity (data) {
  return {
    hash: data.hash,
    txId: data.txId,
    txType: data.txType,
    from: data.from,
    to: data.to,
    blockNumber: data.blockNumber,
    blockHash: data.blockHash,
    transactionIndex: data.transactionIndex,
    nonce: data.nonce,
    gas: data.gas,
    gasPrice: data.gasPrice,
    value: data.value,
    input: data.input,
    v: data.v,
    r: data.r,
    s: data.s,
    timestamp: String(data.timestamp)
  }
}

function rawReceiptToEntity (data) {
  return {
    transactionHash: data.transactionHash,
    transactionIndex: data.transactionIndex,
    blockHash: data.blockHash,
    blockNumber: data.blockNumber,
    from: data.from,
    to: data.to,
    cumulativeGasUsed: data.cumulativeGasUsed,
    gasUsed: data.gasUsed,
    contractAddress: data.contractAddress,
    status: data.status,
    logsBloom: data.logsBloom
  }
}

function rawLogToEntity (data) {
  return {
    logIndex: data.logIndex,
    transactionHash: data.transactionHash,
    transactionIndex: data.transactionIndex,
    blockNumber: data.blockNumber,
    blockHash: data.blockHash,
    address: data.address,
    abi: data.abiId,
    data: data.data,
    signature: data.signature,
    event: data.event,
    timestamp: String(data.timestamp),
    txStatus: data.txStatus,
    eventId: data.eventId
  }
}

function rawLogTopicToEntity (data) {
  return {
    logIndex: data.logIndex,
    transactionHash: data.transactionHash,
    topic: data.topic
  }
}

function rawLogArgToEntity (data) {
  return {
    logIndex: data.logIndex,
    transactionHash: data.transactionHash,
    arg: data.arg
  }
}

function rawLoggedAddressToEntity (data) {
  return {
    logIndex: data.logIndex,
    transactionHash: data.transactionHash,
    address: data.address
  }
}

export {rawTxToEntity, rawReceiptToEntity, rawLogToEntity, rawLogTopicToEntity, rawLogArgToEntity, rawLoggedAddressToEntity}

function rawTxToEntity (data) {
  return {
    hash: data.hash,
    tx_id: data.txId,
    tx_type_id: data.txTypeId,
    from: data.from,
    to: data.to,
    block_number: data.blockNumber,
    block_hash: data.blockHash,
    transaction_index: data.transactionIndex,
    nonce: data.nonce,
    gas: data.gas,
    gas_price: data.gasPrice,
    value: data.value,
    input: data.input,
    v: data.v,
    r: data.r,
    s: data.s,
    timestamp: data.timestamp
  }
}

function rawReceiptToEntity (data) {
  return {
    transaction_hash: data.transactionHash,
    transaction_index: data.transactionIndex,
    block_hash: data.blockHash,
    block_number: data.blockNumber,
    from: data.from,
    to: data.to,
    cumulative_gas_used: data.cumulativeGasUsed,
    gas_used: data.gasUsed,
    contract_address: data.contractAddress,
    status: data.status,
    logs_bloom: data.logsBloom
  }
}

function rawLogToEntity (data) {
  return {
    log_index: data.logIndex,
    transaction_hash: data.transactionHash,
    transaction_index: data.transactionIndex,
    block_number: data.blockNumber,
    block_hash: data.blockHash,
    address: data.address,
    abi: data.abiId,
    data: data.data,
    signture: data.signature,
    event: data.event,
    timestamp: data.timestamp,
    tx_status: data.txStatus
  }
}

function rawLogTopicToEntity (data) {
  return {
    log_index: data.logIndex,
    transaction_hash: data.transactionHash,
    topic: data.topic
  }
}

function rawLogArgToEntity (data) {
  return {
    log_index: data.logIndex,
    transaction_hash: data.transactionHash,
    arg: data.arg
  }
}

function rawLoggedAddressToEntity (data) {
  return {
    log_index: data.logIndex,
    transaction_hash: data.transactionHash,
    address: data.address
  }
}

export {rawTxToEntity, rawReceiptToEntity, rawLogToEntity, rawLogTopicToEntity, rawLogArgToEntity, rawLoggedAddressToEntity}

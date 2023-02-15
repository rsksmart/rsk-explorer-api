function rawBlockToEntity (data) {
  return {
    number: data.number,
    hash: data.hash,
    miner: data.miner,
    parentHash: data.parentHash,
    sha3Uncles: data.sha3Uncles,
    logsBloom: data.logsBloom,
    transactionsRoot: data.transactionsRoot,
    stateRoot: data.stateRoot,
    receiptsRoot: data.receiptsRoot,
    difficulty: data.difficulty,
    totalDifficulty: data.totalDifficulty,
    extraData: data.extraData,
    size: data.size,
    gasLimit: data.gasLimit,
    gasUsed: data.gasUsed,
    timestamp: String(data.timestamp),
    minimumGasPrice: data.minimumGasPrice,
    bitcoinMergedMiningHeader: data.bitcoinMergedMiningHeader,
    bitcoinMergedMiningCoinbaseTransaction: data.bitcoinMergedMiningCoinbaseTransaction,
    bitcoinMergedMiningMerkleProof: data.bitcoinMergedMiningMerkleProof,
    hashForMergedMining: data.hashForMergedMining,
    paidFees: data.paidFees,
    cumulativeDifficulty: data.cumulativeDifficulty,
    received: String(data._received)
  }
}

function blockEntityToRaw (blockEntity) {
  blockEntity['_received'] = Number(blockEntity.received)
  delete blockEntity['received']

  blockEntity['timestamp'] = Number(blockEntity['timestamp'])

  blockEntity.uncles = blockEntity.uncle.map(uncleObj => uncleObj.hash)
  delete blockEntity['uncle']

  return blockEntity
}

export {rawBlockToEntity, blockEntityToRaw}

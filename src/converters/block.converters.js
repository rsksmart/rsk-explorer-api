function rawBlockToEntity (data) {
  return {
    number: data.number,
    hash: data.hash,
    miner: data.miner,
    parent_hash: data.parentHash,
    sha3_uncles: data.sha3Uncles,
    logs_bloom: data.logsBloom,
    transactions_root: data.transactionsRoot,
    state_root: data.stateRoot,
    receipts_root: data.receiptsRoot,
    difficulty: data.difficulty,
    total_difficulty: data.totalDifficulty,
    extra_data: data.extraData,
    size: data.size,
    gas_limit: data.gasLimit,
    gas_used: data.gasUsed,
    timestamp: data.timestamp,
    minimum_gas_price: data.minimumGasPrice,
    bitcoin_merged_mining_header: data.bitcoinMergedMiningHeader,
    bitcoin_merged_mining_coinbase_transaction: data.bitcoinMergedMiningCoinbaseTransaction,
    bitcoin_merged_mining_merkle_proof: data.bitcoinMergedMiningMerkleProof,
    hash_for_merged_mining: data.hashForMergedMining,
    paid_fees: data.paidFees,
    cumulative_difficulty: data.cumulativeDifficulty,
    received: data._received
  }
}

export {rawBlockToEntity}

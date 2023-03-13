function rawStatsToEntity ({
  activeAccounts,
  hashrate,
  timestamp,
  blockHash,
  blockNumber
}) {
  return {
    activeAccounts,
    hashrate: String(hashrate),
    timestamp: String(timestamp),
    blockHash,
    blockNumber
  }
}

function rawCirculatingToEntity ({
  circulatingSupply,
  totalSupply,
  bridgeBalance
}) {
  return {
    circulatingSupply,
    totalSupply,
    bridgeBalance
  }
}

function rawBridgeToEntity ({
  lockingCap
}) {
  return {
    lockingCap
  }
}

export { rawStatsToEntity, rawCirculatingToEntity, rawBridgeToEntity }

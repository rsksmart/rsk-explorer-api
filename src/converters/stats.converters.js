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

function statsEntityToRaw ({
  circulating,
  activeAccounts,
  hashrate,
  timestamp,
  blockHash,
  blockNumber,
  bridge
}) {
  return {
    circulating,
    activeAccounts,
    hashrate: Number(hashrate),
    timestamp: Number(timestamp),
    blockHash,
    blockNumber,
    bridge
  }
}

export { rawStatsToEntity, rawCirculatingToEntity, rawBridgeToEntity, statsEntityToRaw }

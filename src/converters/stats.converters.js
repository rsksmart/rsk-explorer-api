function rawStatsToEntity ({
  circulating,
  activeAccounts,
  hashrate,
  timestamp,
  blockHash,
  blockNumber,
  bridge
}) {
  const statsEntity = {
    blockNumber,
    blockHash,
    activeAccounts,
    hashrate,
    lockingCap: bridge.lockingCap,
    timestamp
  }

  if (circulating) {
    statsEntity.circulatingSupply = circulating.circulatingSupply
    statsEntity.totalSupply = circulating.totalSupply
    statsEntity.bridgeBalance = circulating.bridgeBalance
  }

  return statsEntity
}

function statsEntityToRaw ({
  blockNumber,
  blockHash,
  activeAccounts,
  hashrate,
  circulatingSupply,
  totalSupply,
  bridgeBalance,
  lockingCap,
  timestamp
}) {
  const rawStats = {
    activeAccounts,
    hashrate: Number(hashrate),
    timestamp: Number(timestamp),
    blockHash,
    blockNumber,
    bridge: {
      lockingCap
    }
  }

  if (circulatingSupply && totalSupply && bridgeBalance) {
    rawStats.circulating = {
      circulatingSupply,
      totalSupply,
      bridgeBalance
    }
  }

  return rawStats
}

export { rawStatsToEntity, statsEntityToRaw }

function rawStatsToEntity ({
  circulating,
  activeAccounts,
  hashrate,
  timestamp,
  blockHash,
  blockNumber,
  bridge
}) {
  if (circulating) {
    return {
      blockNumber,
      blockHash,
      activeAccounts,
      hashrate: String(hashrate),
      circulatingSupply: circulating.circulatingSupply,
      totalSupply: circulating.totalSupply,
      bridgeBalance: circulating.bridgeBalance,
      lockingCap: bridge.lockingCap,
      timestamp: String(timestamp)
    }
  } else {
    return {
      blockNumber,
      blockHash,
      activeAccounts,
      hashrate: String(hashrate),
      lockingCap: bridge.lockingCap,
      timestamp: String(timestamp)
    }
  }
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
  const hasCirculating = circulatingSupply && totalSupply && bridgeBalance

  if (hasCirculating) {
    return {
      circulating: {
        circulatingSupply,
        totalSupply,
        bridgeBalance
      },
      activeAccounts,
      hashrate: Number(hashrate),
      timestamp: Number(timestamp),
      blockHash,
      blockNumber,
      bridge: {
        lockingCap
      }
    }
  } else {
    return {
      activeAccounts,
      hashrate: Number(hashrate),
      timestamp: Number(timestamp),
      blockHash,
      blockNumber,
      bridge: {
        lockingCap
      }
    }
  }
}

export { rawStatsToEntity, statsEntityToRaw }

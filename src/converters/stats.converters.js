/* global BigInt */
// Converts a hashrate (hex quantity from eth_netHashrate, decimal string,
// bigint or integer Number) to an exact base-10 integer string. Never emits
// exponent notation, so consumers can parse it with BigInt.
function toIntegerString (value) {
  if (value === undefined || value === null || value === '') return null
  // eslint-disable-next-line valid-typeof
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Invalid hashrate: ${value}`)
    return BigInt(Math.trunc(value)).toString()
  }
  const str = String(value).trim()
  if (/^0x[0-9a-f]+$/i.test(str) || /^\d+$/.test(str)) return BigInt(str).toString()
  throw new Error(`Invalid hashrate: ${value}`)
}

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
    hashrate: toIntegerString(hashrate),
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
    hashrate,
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

export { rawStatsToEntity, statsEntityToRaw, toIntegerString }

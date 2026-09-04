export const RSKBLOCK_MARKER_HEX = Buffer.from('RSKBLOCK:').toString('hex')

const MERGED_MINING_HASH_HEX_LENGTH = 64

function coinbaseScriptsFromRpc (coinbase) {
  const inputs = (coinbase.vin || []).map(input => input && input.coinbase)
  const outputs = (coinbase.vout || []).map(output => output && output.scriptPubKey && output.scriptPubKey.hex)
  return [...inputs, ...outputs].filter(script => typeof script === 'string')
}

export function findRskMergeMiningTag (coinbase) {
  if (!coinbase) return { isMergeMined: false, rskHashForMergedMining: null }

  for (const script of coinbaseScriptsFromRpc(coinbase)) {
    const index = script.toLowerCase().indexOf(RSKBLOCK_MARKER_HEX)
    if (index === -1) continue

    const start = index + RSKBLOCK_MARKER_HEX.length
    const payload = script.slice(start, start + MERGED_MINING_HASH_HEX_LENGTH)
    const complete = payload.length === MERGED_MINING_HASH_HEX_LENGTH && /^[0-9a-f]+$/i.test(payload)

    return { isMergeMined: true, rskHashForMergedMining: complete ? `0x${payload.toLowerCase()}` : null }
  }

  return { isMergeMined: false, rskHashForMergedMining: null }
}

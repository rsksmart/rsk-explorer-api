// 'RSKBLOCK:' marker (RSKIP-110) merge-mining pools embed in the Bitcoin coinbase,
// in an OP_RETURN output or the input scriptSig — so both are scanned.
export const RSK_TAG_HEX = '52534b424c4f434b3a'

const MERGED_MINING_HASH_HEX_LENGTH = 64

// Shapes returned by the Bitcoin JSON-RPC interface: the coinbase input carries its
// script under `coinbase` rather than `scriptSig`, and outputs under `scriptPubKey.hex`.
function coinbaseScripts (coinbase) {
  const inputs = (coinbase.vin || []).map(input => input && input.coinbase)
  const outputs = (coinbase.vout || []).map(output => output && output.scriptPubKey && output.scriptPubKey.hex)
  return [...inputs, ...outputs].filter(script => typeof script === 'string')
}

// Classifies by tag presence alone, never by the presence of Rootstock transactions.
// A block can carry the marker with a truncated payload, so merge-mining status and the
// recovered hash are reported independently.
//
// The 32 bytes after the marker are the RSKIP-110 merged-mining hash, which is not the
// Rootstock block hash and not a prefix of it. It matches block.hash_for_merged_mining.
export function findRskMergeMiningTag (coinbase) {
  if (!coinbase) return { isMergeMined: false, rskHashForMergedMining: null }

  for (const script of coinbaseScripts(coinbase)) {
    const index = script.toLowerCase().indexOf(RSK_TAG_HEX)
    if (index === -1) continue

    const start = index + RSK_TAG_HEX.length
    const payload = script.slice(start, start + MERGED_MINING_HASH_HEX_LENGTH)
    const complete = payload.length === MERGED_MINING_HASH_HEX_LENGTH && /^[0-9a-f]+$/i.test(payload)

    // Prefixed the way Rootstock stores its hashes, so correlating the two chains stays a
    // plain join rather than a per-query transformation.
    return { isMergeMined: true, rskHashForMergedMining: complete ? `0x${payload.toLowerCase()}` : null }
  }

  return { isMergeMined: false, rskHashForMergedMining: null }
}

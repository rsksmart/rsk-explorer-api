import { remove0x } from './utils'

// 'RSKBLOCK:' marker (RSKIP-110) merge-mining pools embed in the Bitcoin
// coinbase, in an OP_RETURN output or the input scriptSig — so both are scanned.
export const RSK_TAG_HEX = '52534b424c4f434b3a'

const hexHasTag = hex =>
  typeof hex === 'string' && remove0x(hex).toLowerCase().includes(RSK_TAG_HEX)

// Handles both the mempool/Esplora shape (`scriptsig` / `scriptpubkey`) and the
// Bitcoin Core RPC shape (`scriptSig.hex` / `scriptPubKey.hex`).
export function isRskMergeMined (coinbase) {
  if (!coinbase) return false

  const inputScripts = (coinbase.vin || []).map(
    input => input && (input.scriptsig || (input.scriptSig && input.scriptSig.hex))
  )
  const outputScripts = (coinbase.vout || []).map(
    output => output && (output.scriptpubkey || (output.scriptPubKey && output.scriptPubKey.hex))
  )

  return [...inputScripts, ...outputScripts].some(hexHasTag)
}

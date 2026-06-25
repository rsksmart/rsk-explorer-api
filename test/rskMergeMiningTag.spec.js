import { expect } from 'chai'
import { isRskMergeMined, RSK_TAG_HEX } from '../src/lib/rskMergeMiningTag'

// 'RSKBLOCK:' + a 32-byte payload, as embedded by merge-mining pools.
const taggedScript = `6a29${RSK_TAG_HEX}${'ab'.repeat(32)}`
const plainScript = '6a14' + 'cd'.repeat(20)

describe('# rskMergeMiningTag', function () {
  describe('isRskMergeMined()', function () {
    it('detects the RSK tag in a coinbase OP_RETURN output (mempool shape)', () => {
      const coinbase = {
        vin: [{ scriptsig: '03abcdef' }],
        vout: [{ scriptpubkey: '76a914' + '00'.repeat(20) + '88ac' }, { scriptpubkey: taggedScript }]
      }
      expect(isRskMergeMined(coinbase)).to.equal(true)
    })

    it('detects the RSK tag in the coinbase input scriptSig', () => {
      const coinbase = { vin: [{ scriptsig: `03abcd${taggedScript}` }], vout: [{ scriptpubkey: plainScript }] }
      expect(isRskMergeMined(coinbase)).to.equal(true)
    })

    it('detects the RSK tag in the Bitcoin Core RPC shape', () => {
      const coinbase = {
        vin: [{ scriptSig: { hex: '03abcdef' } }],
        vout: [{ scriptPubKey: { hex: taggedScript } }]
      }
      expect(isRskMergeMined(coinbase)).to.equal(true)
    })

    it('matches the tag regardless of hex casing', () => {
      const coinbase = { vin: [], vout: [{ scriptpubkey: taggedScript.toUpperCase() }] }
      expect(isRskMergeMined(coinbase)).to.equal(true)
    })

    it('returns false for a coinbase without the RSK tag', () => {
      const coinbase = { vin: [{ scriptsig: '03abcdef' }], vout: [{ scriptpubkey: plainScript }] }
      expect(isRskMergeMined(coinbase)).to.equal(false)
    })

    it('returns false for missing or malformed coinbase data', () => {
      expect(isRskMergeMined(null)).to.equal(false)
      expect(isRskMergeMined({})).to.equal(false)
      expect(isRskMergeMined({ vin: [null], vout: [{}] })).to.equal(false)
    })
  })
})

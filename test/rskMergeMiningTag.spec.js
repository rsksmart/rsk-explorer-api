import { expect } from 'chai'
import { findRskMergeMiningTag, RSKBLOCK_MARKER_HEX } from '../src/lib/rskMergeMiningTag'

const RSK_MERGED_MINING_HASH = '410ac1c4b7fb2330ffa2b6434afb44429b702189371c4158d102fe13008922b6'

const opReturnWithTag = payload => `6a29${RSKBLOCK_MARKER_HEX}${payload}`

const coinbaseWithOutput = script => ({ vin: [{ coinbase: 'aabbcc' }], vout: [{ scriptPubKey: { hex: script } }] })
const coinbaseWithInput = script => ({ vin: [{ coinbase: script }], vout: [{ scriptPubKey: { hex: '76a914' } }] })

describe('rskMergeMiningTag', function () {
  describe('findRskMergeMiningTag()', function () {
    it('detects the tag in an OP_RETURN output and recovers the merged-mining hash', function () {
      const result = findRskMergeMiningTag(coinbaseWithOutput(opReturnWithTag(RSK_MERGED_MINING_HASH)))
      expect(result.isMergeMined).to.equal(true)
      expect(result.rskHashForMergedMining).to.equal(`0x${RSK_MERGED_MINING_HASH}`)
    })

    it('detects the tag in the coinbase input script', function () {
      const result = findRskMergeMiningTag(coinbaseWithInput(`03aabbcc${RSKBLOCK_MARKER_HEX}${RSK_MERGED_MINING_HASH}`))
      expect(result.isMergeMined).to.equal(true)
      expect(result.rskHashForMergedMining).to.equal(`0x${RSK_MERGED_MINING_HASH}`)
    })

    it('is case insensitive on the script hex', function () {
      const result = findRskMergeMiningTag(coinbaseWithOutput(opReturnWithTag(RSK_MERGED_MINING_HASH).toUpperCase()))
      expect(result.isMergeMined).to.equal(true)
      expect(result.rskHashForMergedMining).to.equal(`0x${RSK_MERGED_MINING_HASH}`)
    })

    it('reports merge mining without a hash when the payload is truncated', function () {
      const result = findRskMergeMiningTag(coinbaseWithOutput(`6a29${RSKBLOCK_MARKER_HEX}410ac1c4`))
      expect(result.isMergeMined).to.equal(true)
      expect(result.rskHashForMergedMining).to.equal(null)
    })

    it('does not classify a block whose coinbase carries no tag', function () {
      const result = findRskMergeMiningTag(coinbaseWithOutput('6a24aa21a9ed1122334455'))
      expect(result.isMergeMined).to.equal(false)
      expect(result.rskHashForMergedMining).to.equal(null)
    })

    it('tolerates missing, empty and malformed coinbases', function () {
      for (const input of [null, undefined, {}, { vin: [null], vout: [{}] }, { vin: [{ coinbase: 42 }], vout: [] }]) {
        const result = findRskMergeMiningTag(input)
        expect(result.isMergeMined).to.equal(false)
        expect(result.rskHashForMergedMining).to.equal(null)
      }
    })
  })
})

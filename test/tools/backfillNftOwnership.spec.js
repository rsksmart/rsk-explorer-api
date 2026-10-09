import { expect } from 'chai'
import { exitCodeOf } from '../../src/tools/backfillNftOwnership'

describe('backfillNftOwnership exit code', () => {
  it('exits 1 on a pair left unstored, and 0 on a clean phase A or phase B run', () => {
    const cleanB = { pairs: 9, pairsWritten: 9, pairsFailed: [] }
    const cleanA = { blocksRead: 7, blocksWritten: 6, facts: 13 }

    expect([
      exitCodeOf({ ...cleanB, pairsWritten: 8, pairsFailed: [{ contract: '0x00000000000000000000000000000000000e0721', blockNumber: 12 }] }),
      exitCodeOf(cleanB),
      exitCodeOf(cleanA)
    ]).to.deep.equal([1, 0, 0])
  })
})

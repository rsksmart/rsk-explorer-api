import { expect } from 'chai'
import sinon from 'sinon'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { readResume, writeResume, exitCodeOf } from '../../src/tools/backfillNftOwnership'

describe('backfillNftOwnership resume marker', () => {
  let file

  beforeEach(() => { file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'backfill-marker-')), 'backfill-nft-ownership-B.resume') })
  afterEach(() => {
    sinon.restore()
    fs.rmSync(path.dirname(file), { recursive: true, force: true })
  })

  it('reads back the next block it wrote, and nothing from a missing or unreadable marker', () => {
    expect(readResume(file)).to.equal(null)
    writeResume(file, 2386045)
    expect(readResume(file)).to.equal(2386045)
    fs.writeFileSync(file, '')
    expect(readResume(file)).to.equal(null)
  })

  it('keeps the previous marker when the process dies while writing the next one', () => {
    writeResume(file, 13)
    const write = fs.writeFileSync
    sinon.stub(fs, 'writeFileSync').callsFake(target => {
      write(target, '')
      throw new Error('process killed')
    })

    expect(() => writeResume(file, 17)).to.throw('process killed')
    sinon.restore()

    expect(readResume(file)).to.equal(13)
  })
})

describe('backfillNftOwnership exit code', () => {
  it('exits 1 on a refused phase B run and on a pair left unstored, and 0 on a clean phase A or phase B run', () => {
    const cleanB = { pairs: 9, pairsWritten: 9, pairsFailed: [] }
    const cleanA = { blocksRead: 7, blocksWritten: 6, facts: 13 }

    expect([
      exitCodeOf({ refusedWithoutPhaseAMarker: true }),
      exitCodeOf({ ...cleanB, pairsWritten: 8, pairsFailed: [{ contract: '0x00000000000000000000000000000000000e0721', blockNumber: 12 }] }),
      exitCodeOf(cleanB),
      exitCodeOf(cleanA)
    ]).to.deep.equal([1, 1, 0, 0])
  })
})

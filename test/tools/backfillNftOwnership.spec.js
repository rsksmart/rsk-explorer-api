import { expect } from 'chai'
import sinon from 'sinon'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { readResume, writeResume } from '../../src/tools/backfillNftOwnership'

describe('backfillNftOwnership resume marker', () => {
  let file

  beforeEach(() => { file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'backfill-marker-')), 'backfill-nft-ownership-B.resume') })
  afterEach(() => sinon.restore())

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

import { expect } from 'chai'
import sinon from 'sinon'
import { insertBlock } from '../../src/lib/servicesUtils'
import Block from '../../src/services/classes/Block'
import { blocksRepository } from '../../src/repositories'

const fetchedHash = `0x${'a'.repeat(64)}`
const foreignHash = `0x${'f'.repeat(64)}`
const blocksBase = { nod3: {}, initConfig: { net: { id: '31' } } }

function recordingLog () {
  const lines = { info: [], error: [] }
  const log = { info: m => lines.info.push(String(m)), error: m => lines.error.push(String(m)), warn () {}, debug () {} }
  return { log, lines }
}

describe('# insertBlock checks the stored hash after saving', function () {
  let requestedKeys

  beforeEach(() => {
    requestedKeys = []
    sinon.stub(Block.prototype, 'fetch').callsFake(async function () {
      requestedKeys.push(this.summary.hashOrNumber)
      this.data.block = { number: this.number, hash: fetchedHash }
    })
  })

  afterEach(() => sinon.restore())

  it('fails loud when the save writes, but another block is stored at that height afterwards', async () => {
    const save = sinon.stub(Block.prototype, 'save').resolves(true)
    sinon.stub(blocksRepository, 'findOne').resolves({ number: 500, hash: foreignHash })
    const { log, lines } = recordingLog()

    const result = await insertBlock(500, blocksBase, { log })

    expect(result).to.equal(false)
    expect(save.callCount).to.equal(3)
    expect(lines.info.filter(line => line.includes('saved'))).to.deep.equal([])
    expect(lines.error.some(line => line.includes(`Block 500: db has ${foreignHash}, expected ${fetchedHash}`))).to.equal(true)
  })

  it('fails loud when the save writes, but no row is stored at that height afterwards', async () => {
    sinon.stub(Block.prototype, 'save').resolves(true)
    sinon.stub(blocksRepository, 'findOne').resolves(null)
    const { log, lines } = recordingLog()

    const result = await insertBlock(500, blocksBase, { log })

    expect(result).to.equal(false)
    expect(lines.error).to.include(`Error: Block 500: db has no row, expected ${fetchedHash}`)
  })

  it('fails loud when the save skips because another block is already stored at that height', async () => {
    const saveBlockData = sinon.stub(blocksRepository, 'saveBlockData').resolves()
    sinon.stub(blocksRepository, 'findOne').resolves({ number: 500, hash: foreignHash })
    const { log, lines } = recordingLog()

    const result = await insertBlock(500, { ...blocksBase, log }, { log })

    expect(result).to.equal(false)
    expect(saveBlockData.called).to.equal(false)
    expect(requestedKeys).to.have.lengthOf(3)
    expect(lines.info.filter(line => line.includes('saved'))).to.deep.equal([])
    expect(lines.error.some(line => line.includes(`expected ${fetchedHash}`))).to.equal(true)
  })

  it('fetches by the given hash and compares the stored row with it', async () => {
    const expectedHash = `0x${'b'.repeat(64)}`
    sinon.stub(Block.prototype, 'save').resolves(true)
    sinon.stub(blocksRepository, 'findOne').resolves({ number: 500, hash: fetchedHash })
    const { log } = recordingLog()

    const result = await insertBlock(500, blocksBase, { log, hash: expectedHash })

    expect(requestedKeys).to.deep.equal([expectedHash, expectedHash, expectedHash])
    expect(result).to.equal(false)
  })

  it('logs a save that threw over a row with the expected hash as a possible stats failure, never as saved', async () => {
    sinon.stub(Block.prototype, 'save').rejects(new Error('stats insert failed'))
    sinon.stub(blocksRepository, 'findOne').resolves({ number: 500, hash: fetchedHash })
    const { log, lines } = recordingLog()

    const result = await insertBlock(500, blocksBase, { log })

    expect(result).to.equal(true)
    expect(lines.info.filter(line => line.includes('saved'))).to.deep.equal([])
    expect(lines.error.filter(line => line.includes(`Block 500 (${fetchedHash}) was saved but the blockchain stats saving process may have failed`))).to.have.lengthOf(1)
  })

  it('logs a write as saved when the stored row carries the expected hash', async () => {
    sinon.stub(Block.prototype, 'save').resolves(true)
    sinon.stub(blocksRepository, 'findOne').resolves({ number: 500, hash: fetchedHash })
    const { log, lines } = recordingLog()

    const result = await insertBlock(500, blocksBase, { log })

    expect(result).to.equal(true)
    expect(requestedKeys).to.deep.equal([500])
    expect(lines.info.filter(line => line.includes('saved'))).to.have.lengthOf(1)
  })

  it('accepts a skip over a row that already carries the expected hash, without calling it saved', async () => {
    const saveBlockData = sinon.stub(blocksRepository, 'saveBlockData').resolves()
    sinon.stub(blocksRepository, 'findOne').resolves({ number: 500, hash: fetchedHash })
    const { log, lines } = recordingLog()

    const result = await insertBlock(500, { ...blocksBase, log }, { log })

    expect(result).to.equal(true)
    expect(saveBlockData.called).to.equal(false)
    expect(requestedKeys).to.have.lengthOf(1)
    expect(lines.info.filter(line => line.includes('saved'))).to.deep.equal([])
    expect(lines.info.some(line => line.includes('already in db with the expected hash'))).to.equal(true)
  })
})

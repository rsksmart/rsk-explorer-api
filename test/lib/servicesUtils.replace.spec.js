import { expect } from 'chai'
import sinon from 'sinon'
import { insertBlock } from '../../src/lib/servicesUtils'
import Block from '../../src/services/classes/Block'
import { blocksRepository } from '../../src/repositories'

const log = { info () {}, error () {}, warn () {}, debug () {} }
const blocksBase = { nod3: {}, log, initConfig: { net: { id: '31' } } }

describe('# insertBlock replace-path retry', function () {
  let saveStub

  beforeEach(() => {
    sinon.stub(Block.prototype, 'fetch').callsFake(async function () {
      this.data.block = { number: this.number, hash: '0xcanonical' }
    })
    saveStub = sinon.stub(Block.prototype, 'save')
  })

  afterEach(() => sinon.restore())

  it('retries and reports failure when a failed replace leaves the stale block present', async () => {
    saveStub.rejects(new Error('tx failed'))
    sinon.stub(blocksRepository, 'findOne').resolves({ number: 500, hash: '0xstale' })

    const result = await insertBlock(500, blocksBase, { log, replace: true })

    expect(saveStub.callCount).to.equal(3)
    expect(result).to.equal(false)
  })

  it('reads a row carrying the canonical hash as a saved block and does not retry', async () => {
    saveStub.rejects(new Error('stats failed'))
    sinon.stub(blocksRepository, 'findOne').resolves({ number: 500, hash: '0xcanonical' })

    const result = await insertBlock(500, blocksBase, { log, replace: true })

    expect(saveStub.callCount).to.equal(1)
    expect(result).to.equal(true)
  })

  it('reports success without touching the stored-block check when the save succeeds', async () => {
    saveStub.resolves()
    const findOneSpy = sinon.stub(blocksRepository, 'findOne').resolves(null)

    const result = await insertBlock(500, blocksBase, { log, replace: true })

    expect(saveStub.callCount).to.equal(1)
    expect(findOneSpy.called).to.equal(false)
    expect(result).to.equal(true)
  })
})

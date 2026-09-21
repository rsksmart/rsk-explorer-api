import { expect } from 'chai'
import sinon from 'sinon'
import * as checker from '../../src/services/blocksCongruenceChecker'
import * as servicesUtils from '../../src/lib/servicesUtils'
import * as Setup from '../../src/lib/Setup'
import { blocksRepository } from '../../src/repositories'
import nod3 from '../../src/lib/nod3Connect'

const log = { info () {}, error () {}, warn () {}, debug () {} }

describe('# blocksCongruenceChecker replace-in-place', function () {
  let insertBlockStub
  let deleteOneSpy
  let originalSkipFormatters

  beforeEach(() => {
    originalSkipFormatters = nod3.skipFormatters
    nod3.skipFormatters = true
    sinon.stub(Setup, 'getInitConfig').resolves({ net: { id: '31' } })
    insertBlockStub = sinon.stub(servicesUtils, 'insertBlock').resolves()
    deleteOneSpy = sinon.stub(blocksRepository, 'deleteOne').resolves()
    sinon.stub(nod3.rpc, 'sendMethod')
  })

  afterEach(() => {
    sinon.restore()
    nod3.skipFormatters = originalSkipFormatters
  })

  const drive = ({ number, dbHash, nodeHash, latestBlock, confirmationsThreshold }) => {
    sinon.stub(blocksRepository, 'find').resolves([{ number, hash: '0xlast' }])
    sinon.stub(blocksRepository, 'findOne').withArgs({ number }).resolves({ number, hash: dbHash })
    nod3.rpc.sendMethod.resolves({ number, hash: nodeHash })
    return checker.checkBlocksCongruence(0, { log, latestBlock, confirmationsThreshold })
  }

  it('replaces a non-tip mismatched block through the atomic save path and never deletes it on its own', async () => {
    await drive({ number: 500, dbHash: '0xstale', nodeHash: '0xcanonical', latestBlock: 1000, confirmationsThreshold: 120 })

    expect(deleteOneSpy.called).to.equal(false)
    expect(insertBlockStub.calledOnce).to.equal(true)
    const [calledNumber, , options] = insertBlockStub.firstCall.args
    expect(calledNumber).to.equal(500)
    expect(options.replace).to.equal(true)
    expect(options.tipBlock).to.equal(false)
  })

  it('treats a mismatched block inside the confirmations band as a tip block', async () => {
    await drive({ number: 1000, dbHash: '0xstale', nodeHash: '0xcanonical', latestBlock: 1000, confirmationsThreshold: 120 })

    expect(insertBlockStub.calledOnce).to.equal(true)
    expect(insertBlockStub.firstCall.args[2].tipBlock).to.equal(true)
  })

  it('leaves a congruent block untouched', async () => {
    await drive({ number: 500, dbHash: '0xsame', nodeHash: '0xsame', latestBlock: 1000, confirmationsThreshold: 120 })

    expect(insertBlockStub.called).to.equal(false)
    expect(deleteOneSpy.called).to.equal(false)
  })
})

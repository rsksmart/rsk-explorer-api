import { expect } from 'chai'
import sinon from 'sinon'
import { processCandidate } from '../../src/tools/backfillErc1155.js'

const address = '0x11b64191106b1cf66fcd2f8389077c596cdc5646'

const makeUpdater = (events) => ({
  getContractParser: sinon.stub().resolves({ contractDetails: { interfaces: ['ERC1155'] } }),
  saveContractDetails: sinon.stub().resolves(3),
  updateContractEvents: sinon.stub().resolves({ updatedEvents: { amount: events.length, events } })
})

describe('backfillErc1155 processCandidate', () => {
  it('does not mark the address processed when any re-decoded event failed', async () => {
    const updater = makeUpdater([{ error: false }, { error: true }])
    const markProcessed = sinon.spy()

    const { bucket, entry } = await processCandidate({ updater, address, pageSize: 50, markProcessed })

    expect(markProcessed.called).to.equal(false)
    expect(bucket).to.equal('failed')
    expect(entry).to.deep.equal({ address, updatedEvents: 2, failedEvents: 1 })
  })

  it('marks the address processed and tags it when every event re-decoded cleanly', async () => {
    const updater = makeUpdater([{ error: false }, { error: false }])
    const markProcessed = sinon.spy()

    const { bucket, entry } = await processCandidate({ updater, address, pageSize: 50, markProcessed })

    expect(markProcessed.calledOnceWithExactly(address)).to.equal(true)
    expect(bucket).to.equal('tagged')
    expect(entry).to.deep.equal({ address, updatedEvents: 2 })
  })
})

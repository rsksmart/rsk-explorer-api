import { expect } from 'chai'
import sinon from 'sinon'
import { processCandidate } from '../../src/tools/backfillErc1155.js'

const address = '0x11b64191106b1cf66fcd2f8389077c596cdc5646'
const TRANSFER_SINGLE_TOPIC0 = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'
const NON_ERC1155_TOPIC0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

const failedEvent = topic0 => ({ error: true, eventDebugData: { event: { topics: [topic0] } } })
const decodedEvent = () => ({ error: false })

const makeUpdater = (events) => ({
  getContractParser: sinon.stub().resolves({ contractDetails: { interfaces: ['ERC1155'] } }),
  saveContractDetails: sinon.stub().resolves(3),
  updateContractEvents: sinon.stub().resolves({ updatedEvents: { amount: events.length, events } })
})

describe('backfillErc1155 processCandidate', () => {
  it('tags and processes a contract whose ERC-1155 events all decoded, even if an unrelated event could not', async () => {
    const updater = makeUpdater([failedEvent(NON_ERC1155_TOPIC0), decodedEvent()])
    const markProcessed = sinon.spy()

    const { bucket, entry } = await processCandidate({ updater, address, pageSize: 50, markProcessed })

    expect(markProcessed.calledOnceWithExactly(address)).to.equal(true)
    expect(bucket).to.equal('tagged')
    expect(entry).to.deep.equal({ address, updatedEvents: 2, otherFailures: 1 })
  })

  it('does not process a contract when an ERC-1155 event failed to re-decode', async () => {
    const updater = makeUpdater([failedEvent(TRANSFER_SINGLE_TOPIC0)])
    const markProcessed = sinon.spy()

    const { bucket, entry } = await processCandidate({ updater, address, pageSize: 50, markProcessed })

    expect(markProcessed.called).to.equal(false)
    expect(bucket).to.equal('failed')
    expect(entry).to.deep.equal({ address, updatedEvents: 1, failedEvents: 1, otherFailures: 0 })
  })
})

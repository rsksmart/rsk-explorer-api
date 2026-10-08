import { expect } from 'chai'
import sinon from 'sinon'
import { Nod3 } from '@rsksmart/nod3'
import { JsonRpc } from '@rsksmart/nod3/dist/classes/JsonRpc'
import { processCandidate, CANDIDATE_SETS, candidateSetNamed } from '../../src/tools/redetectContracts.js'
import ContractEventsUpdater from '../../src/services/classes/ContractEventsUpdater'
import { countNodeCalls, REQUEST_TIMEOUT_MS } from '../../src/lib/nodeCallStats'

const address = '0x11b64191106b1cf66fcd2f8389077c596cdc5646'
const candidateSet = CANDIDATE_SETS['nft-transfer-emitters']
const TRANSFER_SINGLE_TOPIC0 = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'
const TRANSFER_TOPIC0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const OWNERSHIP_TRANSFERRED_TOPIC0 = '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0'

const failedEvent = topic0 => ({ error: true, eventDebugData: { event: { topics: [topic0] } } })
const decodedEvent = () => ({ error: false })
const clean = () => ({ calls: 5, reverts: 0, nodeErrors: 0, tokenReadErrors: 0, lastNodeError: null })
const rejected = () => ({ calls: 5, reverts: 0, nodeErrors: 1, tokenReadErrors: 0, lastNodeError: 'injected internal error' })

const makeUpdater = (events, interfaces = ['ERC1155']) => ({
  getContractParser: sinon.stub().resolves({ contractDetails: { interfaces } }),
  saveContractDetails: sinon.stub().resolves(3),
  updateContractEvents: sinon.stub().resolves({ updatedEvents: { amount: events.length, events } })
})
const statsSequence = (...sequence) => sinon.stub().callsFake(() => (sequence.shift() || clean)())

describe('redetectContracts candidate sets', () => {
  it('names the NFT transfer emitters and nothing an object inherits', () => {
    expect(candidateSetNamed('nft-transfer-emitters')).to.equal(candidateSet)
    for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'fungible-transfer-emitters', undefined]) expect(candidateSetNamed(name)).to.equal(null)
  })
})

describe('redetectContracts processCandidate over the NFT transfer emitters', () => {
  it('tags and processes a contract whose NFT events all decoded, even if an unrelated event could not', async () => {
    const updater = makeUpdater([failedEvent(OWNERSHIP_TRANSFERRED_TOPIC0), decodedEvent()])
    const markProcessed = sinon.spy()

    const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize: 50, markProcessed, takeStats: statsSequence() })

    expect(markProcessed.calledOnceWithExactly(address)).to.equal(true)
    expect(bucket).to.equal('tagged')
    expect(entry).to.deep.equal({ address, interfaces: ['ERC1155'], updatedEvents: 2, otherFailures: 1, retries: 0 })
  })

  for (const [standard, topic0] of [['ERC-1155', TRANSFER_SINGLE_TOPIC0], ['ERC-721', TRANSFER_TOPIC0]]) {
    it(`does not process a contract when an ${standard} event failed to re-decode`, async () => {
      const updater = makeUpdater([failedEvent(topic0)])
      const markProcessed = sinon.spy()

      const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize: 50, markProcessed, takeStats: statsSequence() })

      expect(markProcessed.called).to.equal(false)
      expect(bucket).to.equal('failed')
      expect(entry).to.include({ address, updatedEvents: 1, failedEvents: 1, otherFailures: 0 })
    })
  }

  it('stores the interfaces of a contract with no NFT interface and marks it processed', async () => {
    const updater = makeUpdater([decodedEvent()], ['ERC20'])
    const markProcessed = sinon.spy()

    const { bucket } = await processCandidate({ updater, candidateSet, address, pageSize: 50, markProcessed, takeStats: statsSequence() })

    expect(updater.saveContractDetails.calledOnceWithExactly(address, { interfaces: ['ERC20'] })).to.equal(true)
    expect(markProcessed.calledOnce).to.equal(true)
    expect(bucket).to.equal('notTagged')
  })

  it('detects again after a rejected node call and stores only the clean detection', async () => {
    const updater = makeUpdater([decodedEvent()])
    updater.getContractParser.onFirstCall().resolves({ contractDetails: { interfaces: [] } })
    const markProcessed = sinon.spy()

    const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize: 50, markProcessed, takeStats: statsSequence(rejected) })

    expect(updater.getContractParser.callCount).to.equal(2)
    expect(updater.saveContractDetails.calledOnceWithExactly(address, { interfaces: ['ERC1155'] })).to.equal(true)
    expect(bucket).to.equal('tagged')
    expect(entry.retries).to.equal(1)
  })

  it('stores nothing and keeps the contract pending when every detection attempt saw a rejected node call', async () => {
    const updater = makeUpdater([decodedEvent()], [])
    const markProcessed = sinon.spy()

    const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize: 50, markProcessed, takeStats: statsSequence(rejected, rejected, rejected) })

    expect(updater.getContractParser.callCount).to.equal(3)
    expect(updater.saveContractDetails.called).to.equal(false)
    expect(updater.updateContractEvents.called).to.equal(false)
    expect(markProcessed.called).to.equal(false)
    expect(bucket).to.equal('failed')
    expect(entry).to.deep.equal({ address, nodeErrorsPerAttempt: [1, 1, 1] })
  })

  it('keeps the contract pending when the node rejects a call while its events are re-decoded', async () => {
    const updater = makeUpdater([decodedEvent()])
    const markProcessed = sinon.spy()

    const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize: 50, markProcessed, takeStats: statsSequence(clean, rejected) })

    expect(markProcessed.called).to.equal(false)
    expect(bucket).to.equal('failed')
    expect(entry.decodeNodeErrors).to.equal(1)
  })

  describe('through the real contract parser, against a node that fails the ERC-721 probe once', () => {
    const SELECTOR_LESS_CODE = '0x6001600155'
    const answers = probeFaults => ({ method, params }) => {
      if (method === 'eth_getCode') return SELECTOR_LESS_CODE
      if (method === 'eth_getStorageAt') return `0x${'0'.repeat(64)}`
      const interfaceId = `0x${params[0].data.slice(10, 18)}`
      const fault = interfaceId === '0x80ac58cd' && probeFaults.shift()
      if (fault === 'reject') throw new Error('injected internal error')
      if (fault === 'hang') return new Promise(() => {})
      return `0x${'0'.repeat(63)}${['0x01ffc9a7', '0x80ac58cd'].includes(interfaceId) ? 1 : 0}`
    }
    const fakeNode = (answer, { latencyMs = 0 } = {}) => {
      const rpc = new JsonRpc({
        send: async payload => {
          if (latencyMs) await new Promise(resolve => setTimeout(resolve, latencyMs))
          return { jsonrpc: '2.0', id: payload.id, result: await answer(payload) }
        }
      })
      return new Nod3({ url: 'fake', rpc })
    }
    const realUpdater = nod3 => {
      const updater = new ContractEventsUpdater({ nod3, log: { info () {}, error () {} } })
      sinon.stub(updater, 'getInitConfig').resolves({ net: { id: '30' } })
      sinon.stub(updater, 'getContractABI').resolves(null)
      sinon.stub(updater, 'saveContractDetails').resolves(2)
      sinon.stub(updater, 'fetchPaginatedEvents').resolves({ events: [], next: null })
      sinon.spy(updater, 'getContractParser')
      return updater
    }

    it('never stores a rejected probe as "not an NFT"', async () => {
      const { nod3, takeStats } = countNodeCalls(fakeNode(answers(['reject'])))
      const updater = realUpdater(nod3)

      const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize: 50, markProcessed: sinon.spy(), takeStats })

      expect(updater.saveContractDetails.callCount).to.equal(1)
      expect(updater.saveContractDetails.firstCall.args[1].interfaces).to.include('ERC721')
      expect(bucket).to.equal('tagged')
      expect(entry.retries).to.equal(1)
    })

    it('detects each candidate once: its events are re-decoded with the clean detection', async () => {
      const { nod3, takeStats } = countNodeCalls(fakeNode(answers([])))
      const updater = realUpdater(nod3)

      const { bucket } = await processCandidate({ updater, candidateSet, address, pageSize: 50, markProcessed: sinon.spy(), takeStats })

      expect(bucket).to.equal('tagged')
      expect(updater.getContractParser.callCount).to.equal(1)
    })

    describe('with the timeouts the tool runs with', () => {
      let clock
      beforeEach(() => { clock = sinon.useFakeTimers() })
      afterEach(() => clock.restore())

      it('spends one detection attempt on one request the node never answers', async () => {
        const { nod3, takeStats } = countNodeCalls(fakeNode(answers(['hang']), { latencyMs: 10 }))
        const updater = realUpdater(nod3)

        const processing = processCandidate({ updater, candidateSet, address, pageSize: 50, markProcessed: sinon.spy(), takeStats })
        await clock.tickAsync(3 * REQUEST_TIMEOUT_MS)
        const { bucket, entry } = await processing

        expect(bucket).to.equal('tagged')
        expect(entry.retries).to.equal(1)
        expect(updater.saveContractDetails.firstCall.args[1].interfaces).to.include('ERC721')
      })
    })
  })
})

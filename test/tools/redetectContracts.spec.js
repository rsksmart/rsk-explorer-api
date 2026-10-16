import { expect } from 'chai'
import sinon from 'sinon'
import { Nod3 } from '@rsksmart/nod3'
import { JsonRpc } from '@rsksmart/nod3/dist/classes/JsonRpc'
import { processCandidate, redetectCandidates, CANDIDATE_SETS, candidateSetNamed } from '../../src/tools/redetectContracts.js'
import ContractEventsUpdater from '../../src/services/classes/ContractEventsUpdater'
import { eventRepository } from '../../src/repositories'

const address = '0x11b64191106b1cf66fcd2f8389077c596cdc5646'
const candidateSet = CANDIDATE_SETS['nft-transfer-emitters']
const TRANSFER_SINGLE_TOPIC0 = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'
const TRANSFER_TOPIC0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const OWNERSHIP_TRANSFERRED_TOPIC0 = '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0'

const failedEvent = topic0 => ({ error: true, eventDebugData: { event: { topics: [topic0] } } })
const decodedEvent = () => ({ error: false })

const makeUpdater = (events, interfaces = ['ERC1155']) => ({
  getContractParser: sinon.stub().resolves({ contractDetails: { interfaces } }),
  saveContractDetails: sinon.stub().resolves(3),
  updateContractEvents: sinon.stub().resolves({ updatedEvents: { amount: events.length, events } })
})

describe('redetectContracts candidate sets', () => {
  it('names the NFT transfer emitters, and an unknown name gives null', () => {
    expect(candidateSetNamed('nft-transfer-emitters')).to.equal(candidateSet)
    expect(candidateSetNamed('fungible-transfer-emitters')).to.equal(null)
  })
})

describe('redetectContracts over a list of candidates', () => {
  it('detects and re-decodes every candidate on every run: a second run skips none of them', async () => {
    const candidates = ['0x1', '0x2', '0x3'].map(prefix => `${prefix}${'0'.repeat(39)}`)
    const updater = makeUpdater([decodedEvent()])

    const first = await redetectCandidates({ updater, candidateSet, candidates, pageSize: 50 })
    const second = await redetectCandidates({ updater, candidateSet, candidates, pageSize: 50 })

    expect(second).to.deep.equal(first)
    expect(first.tagged.map(entry => entry.address)).to.deep.equal(candidates)
    expect(updater.getContractParser.args.map(([address]) => address)).to.deep.equal([...candidates, ...candidates])
    expect(updater.updateContractEvents.callCount).to.equal(6)
  })
})

describe('redetectContracts processCandidate over the NFT transfer emitters', () => {
  it('tags a contract whose NFT events all decoded, even if an unrelated event could not', async () => {
    const updater = makeUpdater([failedEvent(OWNERSHIP_TRANSFERRED_TOPIC0), decodedEvent()])

    const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize: 50 })

    expect(bucket).to.equal('tagged')
    expect(entry).to.deep.equal({ address, interfaces: ['ERC1155'], updatedEvents: 2, otherFailures: 1 })
  })

  for (const [standard, topic0] of [['ERC-1155', TRANSFER_SINGLE_TOPIC0], ['ERC-721', TRANSFER_TOPIC0]]) {
    it(`reports a contract as failed when an ${standard} event failed to re-decode`, async () => {
      const updater = makeUpdater([failedEvent(topic0)])

      const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize: 50 })

      expect(bucket).to.equal('failed')
      expect(entry).to.include({ address, updatedEvents: 1, failedEvents: 1, otherFailures: 0 })
    })
  }

  it('stores the interfaces of a contract with no NFT interface and reports it as not tagged', async () => {
    const updater = makeUpdater([decodedEvent()], ['ERC20'])

    const { bucket } = await processCandidate({ updater, candidateSet, address, pageSize: 50 })

    expect(updater.saveContractDetails.calledOnceWithExactly(address, { interfaces: ['ERC20'] })).to.equal(true)
    expect(bucket).to.equal('notTagged')
  })

  it('stores nothing and reports the contract as failed when its detection throws, so a rerun detects it again', async () => {
    const updater = makeUpdater([decodedEvent()])
    updater.getContractParser.rejects(new Error('injected node error'))

    const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize: 50 })

    expect(updater.saveContractDetails.called).to.equal(false)
    expect(updater.updateContractEvents.called).to.equal(false)
    expect(bucket).to.equal('failed')
    expect(entry).to.deep.equal({ address, error: 'injected node error' })
  })

  describe('through the real contract parser, against a node that answers every probe', () => {
    const SELECTOR_LESS_CODE = '0x6001600155'
    const answer = ({ method, params }) => {
      if (method === 'eth_getCode') return SELECTOR_LESS_CODE
      if (method === 'eth_getStorageAt') return `0x${'0'.repeat(64)}`
      const interfaceId = `0x${params[0].data.slice(10, 18)}`
      return `0x${'0'.repeat(63)}${['0x01ffc9a7', '0x80ac58cd'].includes(interfaceId) ? 1 : 0}`
    }
    const fakeNode = () => {
      const rpc = new JsonRpc({ send: async payload => ({ jsonrpc: '2.0', id: payload.id, result: await answer(payload) }) })
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

    it('detects each candidate once and re-decodes its stored events with that detection', async () => {
      const word = hex => `0x${hex.replace(/^0x/, '').padStart(64, '0')}`
      const storedTransfer = {
        eventId: '0222dee200800b6b87e4ec24d4947c0b',
        address,
        blockNumber: 2285282,
        transactionHash: `0x${'ab'.repeat(32)}`,
        logIndex: 0,
        timestamp: 1700000000,
        topics: [TRANSFER_TOPIC0, word('0x0'), word('0x1111111111111111111111111111111111111111'), word('0x7')],
        data: '0x'
      }
      const updater = realUpdater(fakeNode())
      updater.fetchPaginatedEvents.resolves({ events: [storedTransfer], next: null })
      const upsertOne = sinon.stub(eventRepository, 'upsertOne').resolves({})

      const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize: 50 }).finally(() => upsertOne.restore())

      expect(bucket).to.equal('tagged')
      expect(updater.getContractParser.callCount).to.equal(1)
      expect(entry.updatedEvents).to.equal(1)
      expect(upsertOne.callCount).to.equal(1)
      expect(upsertOne.firstCall.args[0]).to.include({ eventId: storedTransfer.eventId, event: 'Transfer' })
    })
  })
})

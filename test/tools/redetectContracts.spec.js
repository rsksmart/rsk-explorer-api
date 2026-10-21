import { expect } from 'chai'
import sinon from 'sinon'
import { Nod3 } from '@rsksmart/nod3'
import {
  processCandidate,
  redetectCandidates,
  CANDIDATE_SETS,
  candidateSetNamed
} from '../../src/tools/redetectContracts.js'
import ContractEventsUpdater from '../../src/services/classes/ContractEventsUpdater'
import { eventRepository } from '../../src/repositories'

const address = '0x11b64191106b1cf66fcd2f8389077c596cdc5646'
const candidateSet = CANDIDATE_SETS['nft-transfer-emitters']
const TRANSFER_SINGLE_TOPIC0 = '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62'
const TRANSFER_TOPIC0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const OWNERSHIP_TRANSFERRED_TOPIC0 = '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0'

const failedEvent = topic0 => ({ error: true, eventDebugData: { event: { topics: [topic0] } } })
const decodedEvent = () => ({ error: false })

const tokenData = { name: 'Rootstock Punks', symbol: 'RPUNK', decimals: '0', totalSupply: '100' }

const makeParser = () => ({
  makeContract: sinon.stub().returns({ address }),
  getDefaultTokenData: sinon.stub().resolves(tokenData)
})

const makeUpdater = (events, interfaces = ['ERC1155']) => ({
  getContractParser: sinon.stub().resolves({ parser: makeParser(), contractDetails: { interfaces } }),
  saveContractDetails: sinon.stub().resolves(3),
  updateContractEvents: sinon.stub().resolves({ updatedEvents: { amount: events.length, events } }),
  saveMissingTokenNames: sinon.stub().resolves(null)
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
    expect(entry).to.deep.equal({ address, interfaces: ['ERC1155'], updatedEvents: 2, otherFailures: 1, named: null })
  })

  it('writes the token name, symbol and decimals of a tagged contract, normalized, and reports what it wrote', async () => {
    const updater = makeUpdater([decodedEvent()])
    const named = { name: 'Rootstock Punks', symbol: 'RPUNK', decimals: 0 }
    updater.saveMissingTokenNames.resolves(named)

    const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize: 50 })

    expect(updater.saveMissingTokenNames.firstCall.args[1]).to.include(named)
    expect([bucket, entry.named]).to.deep.equal(['tagged', named])
  })

  it('reports a tagged contract as failed when its token data cannot be read or written, so a rerun retries it', async () => {
    const unreadable = makeUpdater([decodedEvent()])
    const { parser } = await unreadable.getContractParser()
    parser.getDefaultTokenData.rejects(new Error('injected token data error'))
    unreadable.getContractParser.resolves({ parser, contractDetails: { interfaces: ['ERC721'] } })
    const unwritable = makeUpdater([decodedEvent()])
    unwritable.saveMissingTokenNames.rejects(new Error('injected write error'))

    const results = await Promise.all([unreadable, unwritable].map(updater =>
      processCandidate({ updater, candidateSet, address, pageSize: 50 })))

    expect(results).to.deep.equal([
      { bucket: 'failed', entry: { address, error: 'injected token data error' } },
      { bucket: 'failed', entry: { address, error: 'injected write error' } }
    ])
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
    expect(updater.saveMissingTokenNames.called).to.equal(false)
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
    const ERC165_AND_ERC721_INTERFACE_IDS = ['0x01ffc9a7', '0x80ac58cd']
    const answerProbe = ({ method, params }) => {
      if (method === 'eth_getCode') return SELECTOR_LESS_CODE
      if (method === 'eth_getStorageAt') return `0x${'0'.repeat(64)}`
      const interfaceId = `0x${params[0].data.slice(10, 18)}`
      return `0x${'0'.repeat(63)}${ERC165_AND_ERC721_INTERFACE_IDS.includes(interfaceId) ? 1 : 0}`
    }
    const fakeNode = () => {
      const rpc = { sendMethod: async (method, params = []) => answerProbe({ method, params }) }
      return new Nod3({ url: 'fake', rpc })
    }
    const realUpdater = nod3 => {
      const updater = new ContractEventsUpdater({ nod3, log: { info () {}, error () {} } })
      sinon.stub(updater, 'getInitConfig').resolves({ net: { id: '30' } })
      sinon.stub(updater, 'getContractABI').resolves(null)
      sinon.stub(updater, 'saveContractDetails').resolves(2)
      sinon.stub(updater, 'saveMissingTokenNames').resolves(null)
      sinon.stub(updater, 'fetchPaginatedEvents').resolves({ events: [], next: null })
      sinon.spy(updater, 'getContractParser')
      return updater
    }

    it('detects each candidate once and re-decodes its stored events with that detection', async () => {
      const padTo32Bytes = hex => `0x${hex.replace(/^0x/, '').padStart(64, '0')}`
      const storedTransfer = {
        eventId: '0222dee200800b6b87e4ec24d4947c0b',
        address,
        blockNumber: 2285282,
        transactionHash: `0x${'ab'.repeat(32)}`,
        logIndex: 0,
        timestamp: 1700000000,
        topics: [
          TRANSFER_TOPIC0,
          padTo32Bytes('0x0'),
          padTo32Bytes('0x1111111111111111111111111111111111111111'),
          padTo32Bytes('0x7')
        ],
        data: '0x'
      }
      const updater = realUpdater(fakeNode())
      updater.fetchPaginatedEvents.resolves({ events: [storedTransfer], next: null })
      const upsertOne = sinon.stub(eventRepository, 'upsertOne').resolves({})

      const { bucket, entry } = await processCandidate({ updater, candidateSet, address, pageSize: 50 })
        .finally(() => upsertOne.restore())

      expect(bucket).to.equal('tagged')
      expect(updater.getContractParser.callCount).to.equal(1)
      expect(entry.updatedEvents).to.equal(1)
      expect(upsertOne.callCount).to.equal(1)
      expect(upsertOne.firstCall.args[0]).to.include({ eventId: storedTransfer.eventId, event: 'Transfer' })
    })
  })
})

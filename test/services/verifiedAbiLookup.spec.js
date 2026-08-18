import { assert } from 'chai'
import sinon from 'sinon'
import { verificationResultsRepository } from '../../src/repositories'
import {
  rawVerificationResultsToEntity,
  verificationResultsEntityToRaw
} from '../../src/converters/verificationResults.converters'
import ContractEventsUpdater from '../../src/services/classes/ContractEventsUpdater'
import Contract from '../../src/services/classes/Contract'
import { verificationStatus } from '../../src/lib/types'

const ADDRESS = '0x0d5de6a7b5e4c0d0dbd1cae1e7b1c8e4f7d9a0b1'
const ABI = [{ type: 'function', name: 'transfer' }]

// A row as the current API writes it: the three legacy blobs are no longer
// populated, so the ABI has to survive a converter written around them.
const currentRow = {
  id: 'a3f1c2d4-0000-4000-8000-000000000000',
  address: ADDRESS,
  match: true,
  status: verificationStatus.SUCCESS,
  request: null,
  result: null,
  sources: null,
  abi: JSON.stringify(ABI),
  timestamp: BigInt(1786489378667)
}

describe('Verified ABI lookup', () => {
  describe('the predicate both readers query by', () => {
    // Contract and ContractEventsUpdater resolve the ABI through the same column. A stub
    // that only reads `address` stays green if the predicate reverts to `match`, so what
    // is asserted is the argument the repository received.
    it('asks for a successful status, not a match', async () => {
      const findOne = sinon.stub(verificationResultsRepository, 'findOne').resolves({
        ...currentRow,
        abi: JSON.stringify(ABI)
      })

      try {
        await Contract.prototype.getVerifiedAbiFromDatabase.call({}, ADDRESS)

        assert.deepEqual(findOne.firstCall.args[0], {
          address: ADDRESS,
          status: verificationStatus.SUCCESS
        })
      } finally {
        findOne.restore()
      }
    })
  })

  describe('the socket writer still reachable in this repo', () => {
    // The lookup filters on status, so a writer that only sets match would store rows
    // this service can no longer find. The converter is the narrow point: it copies a
    // fixed field list, and anything absent from it is dropped before the insert.
    it('carries status from the written document into the stored row', () => {
      const entity = rawVerificationResultsToEntity({
        id: 'b4e2d3c5-0000-4000-8000-000000000000',
        address: ADDRESS,
        match: true,
        status: verificationStatus.SUCCESS,
        request: {},
        result: {},
        abi: ABI,
        sources: [],
        timestamp: 1786489378667
      })

      assert.equal(entity.status, verificationStatus.SUCCESS)
    })

    it('reads status back out of a stored row', () => {
      const raw = verificationResultsEntityToRaw({ ...currentRow })

      assert.equal(raw.status, verificationStatus.SUCCESS)
    })
  })

  describe('the row shape the API writes today', () => {
    it('yields the ABI with the legacy blobs absent', () => {
      const raw = verificationResultsEntityToRaw(currentRow)

      assert.deepEqual(raw.abi, ABI)
      assert.notProperty(raw, 'request')
      assert.notProperty(raw, 'result')
      assert.notProperty(raw, 'sources')
    })

    it('still yields the ABI when the legacy blobs are present', () => {
      const raw = verificationResultsEntityToRaw({
        ...currentRow,
        request: '{"address":"0x0"}',
        result: '{"name":"Token"}',
        sources: '[]'
      })

      assert.deepEqual(raw.abi, ABI)
      assert.deepEqual(raw.result, { name: 'Token' })
    })
  })

  describe('the predicate the indexer asks the database for', () => {
    let findOneStub

    beforeEach(() => {
      findOneStub = sinon.stub(verificationResultsRepository, 'findOne')
      findOneStub.resolves(verificationResultsEntityToRaw(currentRow))
    })

    afterEach(() => findOneStub.restore())

    it('selects a verification by status, not by match', async () => {
      const updater = new ContractEventsUpdater({ log: { error () {}, warn () {}, info () {}, debug () {} } })

      const abi = await updater.fetchAbiFromDb(ADDRESS)

      assert.deepEqual(abi, ABI)
      assert.deepEqual(findOneStub.firstCall.args[0], {
        address: ADDRESS,
        status: verificationStatus.SUCCESS
      })
    })

    it('returns nothing when no successful verification exists', async () => {
      findOneStub.resolves(null)
      const updater = new ContractEventsUpdater({ log: { error () {}, warn () {}, info () {}, debug () {} } })

      assert.isNull(await updater.fetchAbiFromDb(ADDRESS))
    })
  })
})

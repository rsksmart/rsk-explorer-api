import { assert } from 'chai'
import sinon from 'sinon'
import { verificationResultsRepository } from '../../src/repositories'
import {
  getVerificationResultsRepository,
  verifiedQuery
} from '../../src/repositories/verificationResults.repository'
import {
  rawVerificationResultsToEntity,
  verificationResultsEntityToRaw
} from '../../src/converters/verificationResults.converters'
import ContractEventsUpdater from '../../src/services/classes/ContractEventsUpdater'
import Contract from '../../src/services/classes/Contract'
import { fetchAbiFromDb as fetchAbiFromDbTool } from '../../src/tools/utils'
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

const silentLog = { error () {}, warn () {}, info () {}, debug () {} }

const repositoryOver = (row) => {
  const findFirst = sinon.stub().resolves(row)
  const repository = getVerificationResultsRepository({
    verification_result: { findFirst }
  })

  return { repository, findFirst }
}

describe('Verified ABI lookup', () => {
  describe('the predicate every reader shares', () => {
    it('asks for a successful status and nothing else', () => {
      assert.deepEqual(verifiedQuery(ADDRESS), {
        address: ADDRESS,
        status: verificationStatus.SUCCESS
      })
    })

    it('does not fall back to match', () => {
      assert.notProperty(verifiedQuery(ADDRESS), 'match')
    })
  })

  describe('findVerifiedAbi, the one place the rule lives', () => {
    it('queries by status, reads only the abi column, and never lets a NULL timestamp win', async () => {
      const { repository, findFirst } = repositoryOver(currentRow)

      await repository.findVerifiedAbi(ADDRESS)

      assert.deepEqual(findFirst.firstCall.args[0], {
        where: { address: ADDRESS, status: verificationStatus.SUCCESS },
        select: { abi: true },
        orderBy: [{ timestamp: { sort: 'desc', nulls: 'last' } }]
      })
    })

    it('yields the stored ABI of a successful verification', async () => {
      const { repository } = repositoryOver(currentRow)

      assert.deepEqual(await repository.findVerifiedAbi(ADDRESS), ABI)
    })

    it('yields nothing when no successful verification exists', async () => {
      const { repository } = repositoryOver(null)

      assert.isNull(await repository.findVerifiedAbi(ADDRESS))
    })

    // An empty array is an absent ABI, not an ABI with no entries. Handing it to the
    // parser replaces the default ABI with one that decodes nothing, so every event on
    // the contract silently stops resolving.
    it('treats a stored empty ABI as absent', async () => {
      const { repository } = repositoryOver({ ...currentRow, abi: '[]' })

      assert.isNull(await repository.findVerifiedAbi(ADDRESS))
    })

    it('treats a row with no ABI at all as absent', async () => {
      const { repository } = repositoryOver({ ...currentRow, abi: null })

      assert.isNull(await repository.findVerifiedAbi(ADDRESS))
    })
  })

  describe('the readers that resolve an ABI', () => {
    let findVerifiedAbi

    beforeEach(() => {
      findVerifiedAbi = sinon.stub(verificationResultsRepository, 'findVerifiedAbi').resolves(ABI)
    })

    afterEach(() => findVerifiedAbi.restore())

    // Three call sites used to carry their own copy of the predicate and their own
    // not-null guard, and two of the three had already drifted apart. What is asserted
    // is that each one delegates, because a reader holding its own query can diverge again.
    it('the indexer entity delegates, passing the address', async () => {
      assert.deepEqual(await Contract.prototype.getVerifiedAbiFromDatabase.call({}, ADDRESS), ABI)
      assert.deepEqual(findVerifiedAbi.firstCall.args, [ADDRESS])
    })

    it('the events updater delegates, passing the address', async () => {
      const updater = new ContractEventsUpdater({ log: silentLog })

      assert.deepEqual(await updater.fetchAbiFromDb(ADDRESS), ABI)
      assert.deepEqual(findVerifiedAbi.firstCall.args, [ADDRESS])
    })

    it('the contract-data tool delegates, passing the address', async () => {
      assert.deepEqual(await fetchAbiFromDbTool(ADDRESS), ABI)
      assert.deepEqual(findVerifiedAbi.firstCall.args, [ADDRESS])
    })

    it('every reader reports nothing when the lookup finds nothing', async () => {
      findVerifiedAbi.resolves(null)
      const updater = new ContractEventsUpdater({ log: silentLog })

      assert.isNull(await Contract.prototype.getVerifiedAbiFromDatabase.call({}, ADDRESS))
      assert.isNull(await updater.fetchAbiFromDb(ADDRESS))
      assert.isNull(await fetchAbiFromDbTool(ADDRESS))
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
})

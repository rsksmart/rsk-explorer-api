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
import defaultABI from '@rsksmart/rsk-contract-parser/dist/lib/Abi'

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

// Mainnet holds two rows of this shape, both from 2021.
const successRowWhoseBytecodeDidNotMatch = { match: false }

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

    it('asserts that a verification run succeeded, and not that the compiled bytecode reproduced the deployed one', async () => {
      const { repository } = repositoryOver({ ...currentRow, ...successRowWhoseBytecodeDidNotMatch })

      assert.deepEqual(await repository.findDecodableVerifiedAbi(ADDRESS), ABI)
    })
  })

  describe('findDecodableVerifiedAbi, the one place the rule lives', () => {
    it('queries by status, reads only the abi column, never lets a NULL timestamp win, and breaks a timestamp tie on the guid', async () => {
      const { repository, findFirst } = repositoryOver(currentRow)

      await repository.findDecodableVerifiedAbi(ADDRESS)

      assert.deepEqual(findFirst.firstCall.args[0], {
        where: { address: ADDRESS, status: verificationStatus.SUCCESS },
        select: { abi: true },
        orderBy: [{ timestamp: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }]
      })
    })

    it('yields the stored ABI of a successful verification', async () => {
      const { repository } = repositoryOver(currentRow)

      assert.deepEqual(await repository.findDecodableVerifiedAbi(ADDRESS), ABI)
    })

    it('yields nothing when no successful verification exists', async () => {
      const { repository } = repositoryOver(null)

      assert.isNull(await repository.findDecodableVerifiedAbi(ADDRESS))
    })

    it('reports nothing decodable for a stored empty ABI, which would decode no event at all', async () => {
      const { repository } = repositoryOver({ ...currentRow, abi: '[]' })

      assert.isNull(await repository.findDecodableVerifiedAbi(ADDRESS))
    })

    it('reports nothing decodable for a row with no ABI at all', async () => {
      const { repository } = repositoryOver({ ...currentRow, abi: null })

      assert.isNull(await repository.findDecodableVerifiedAbi(ADDRESS))
    })
  })

  describe('the readers that resolve an ABI', () => {
    let findDecodableVerifiedAbi

    beforeEach(() => {
      findDecodableVerifiedAbi = sinon.stub(verificationResultsRepository, 'findDecodableVerifiedAbi').resolves(ABI)
    })

    afterEach(() => findDecodableVerifiedAbi.restore())

    // Three call sites used to carry their own copy of the predicate and their own
    // not-null guard, and two of the three had already drifted apart. What is asserted
    // is that each one delegates, because a reader holding its own query can diverge again.
    it('the indexer entity delegates, passing the address', async () => {
      assert.deepEqual(await Contract.prototype.getAbiToDecodeWith.call({}, ADDRESS), ABI)
      assert.deepEqual(findDecodableVerifiedAbi.firstCall.args, [ADDRESS])
    })

    it('the events updater delegates, passing the address', async () => {
      const updater = new ContractEventsUpdater({ log: silentLog })

      assert.deepEqual(await updater.fetchAbiFromDb(ADDRESS), ABI)
      assert.deepEqual(findDecodableVerifiedAbi.firstCall.args, [ADDRESS])
    })

    it('the contract-data tool delegates, passing the address', async () => {
      assert.deepEqual(await fetchAbiFromDbTool(ADDRESS), ABI)
      assert.deepEqual(findDecodableVerifiedAbi.firstCall.args, [ADDRESS])
    })

    it('the parser reader answers the default ABI when nothing decodable is stored', async () => {
      findDecodableVerifiedAbi.resolves(null)

      const abi = await Contract.prototype.getAbiToDecodeWith.call({}, ADDRESS)

      assert.deepEqual(abi, defaultABI)
      assert.isAbove(abi.length, 0)
    })

    it('the readers that decide whether a verified ABI exists still report nothing', async () => {
      findDecodableVerifiedAbi.resolves(null)
      const updater = new ContractEventsUpdater({ log: silentLog })

      assert.isNull(await updater.fetchAbiFromDb(ADDRESS))
      assert.isNull(await fetchAbiFromDbTool(ADDRESS))
    })
  })

  describe('findNewestVerified, which the v1 getsourcecode reader asks through', () => {
    it('asks for a successful row and the newest timestamp, and ends the order on the guid so two rows written in the same millisecond cannot answer differently', async () => {
      const { repository, findFirst } = repositoryOver(currentRow)

      await repository.findNewestVerified(ADDRESS)

      assert.deepEqual(findFirst.firstCall.args[0], {
        where: { address: ADDRESS, status: verificationStatus.SUCCESS },
        orderBy: [{ timestamp: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }]
      })
    })

    it('yields nothing when every row for the address failed', async () => {
      const { repository } = repositoryOver(null)

      assert.isNull(await repository.findNewestVerified(ADDRESS))
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

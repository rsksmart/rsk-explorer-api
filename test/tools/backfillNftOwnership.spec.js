import { expect } from 'chai'
import sinon from 'sinon'
import { backfillTokenStates, backfillTransfers, exitCodeOf } from '../../src/tools/backfillNftOwnership'
import { nftRepository, tokenStateRepository } from '../../src/repositories'

describe('backfillNftOwnership exit code', () => {
  it('exits 1 on a pair left unstored, and 0 on a clean phase A or phase B run', () => {
    const cleanB = { pairs: 9, pairsWritten: 9, pairsFailed: [] }
    const cleanA = { blocksRead: 7, blocksWritten: 6, facts: 13 }

    expect([
      exitCodeOf({ ...cleanB, pairsWritten: 8, pairsFailed: [{ contract: '0x00000000000000000000000000000000000e0721', blockNumber: 12 }] }),
      exitCodeOf(cleanB),
      exitCodeOf(cleanA)
    ]).to.deep.equal([1, 0, 0])
  })
})

describe('backfillNftOwnership phase A write retries', () => {
  const block = { number: 10, hash: '0xa10' }
  const refusal = code => Object.assign(new Error(`refused ${code}`), { code })

  const phaseA = ($transaction, factsWrittenMeanwhile) => {
    const nextBlocks = sinon.stub().resolves([])
    nextBlocks.onFirstCall().resolves([block])
    const prismaClient = {
      $transaction,
      block: { findMany: nextBlocks, findUnique: sinon.stub().resolves({ number: block.number }) },
      event: { findMany: sinon.stub().resolves([{ blockHash: block.hash, topic0: '0x01', topic1: null, topic2: null, topic3: null }]) },
      token_transfer: { groupBy: sinon.stub().resolves([]), findFirst: sinon.stub().resolves(factsWrittenMeanwhile ? { eventId: 'e1' } : null) }
    }
    return backfillTransfers({ prismaClient, fromBlock: 0, toBlock: 100, chunkBlocks: 10 })
  }

  afterEach(() => sinon.restore())

  it('writes a block again after a refusal when a holder changed, and skips as raced a block another writer wrote meanwhile', async () => {
    sinon.stub(nftRepository, 'insertStatements').resolves([{ op: 'token_transfer.createMany' }])
    sinon.stub(console, 'log')
    const refusedOnce = sinon.stub().resolves([{ count: 2 }])
    refusedOnce.onFirstCall().rejects(refusal('P2025'))
    const refusedAsWritten = sinon.stub().rejects(refusal('P2002'))

    const [retried, skipped] = [await phaseA(refusedOnce, false), await phaseA(refusedAsWritten, true)]

    expect([retried.blocksWritten, retried.blocksRaced, refusedOnce.callCount]).to.deep.equal([1, 0, 2])
    expect([skipped.blocksWritten, skipped.blocksRaced, refusedAsWritten.callCount]).to.deep.equal([0, 1, 1])
  })
})

describe('backfillNftOwnership phase B write retries', () => {
  const block = { number: 10, hash: '0xa10' }
  const pair = { contract: '0x00000000000000000000000000000000000e0721', blockNumber: 10, blockHash: block.hash }
  const raceRefusal = attempt => Object.assign(new Error(`refused on attempt ${attempt}`), { code: 'P2002' })

  const phaseB = ($transaction, pairReads) => {
    const nextBlocks = sinon.stub().resolves([])
    nextBlocks.onFirstCall().resolves([block])
    const prismaClient = {
      $transaction,
      block: { findMany: nextBlocks, update: args => ({ op: 'block.update', ...args }) },
      token_transfer: { groupBy: pairReads },
      token_state_at_block: { findMany: sinon.stub().resolves([]) }
    }
    const fetchers = [{ fetchOne: sinon.stub().resolves({ contract: pair.contract }) }]
    const report = { blocksRead: 0, pairs: 0, pairsAlreadyStored: 0, pairsWritten: 0, pairsFailed: [], pairsRaced: 0 }
    return backfillTokenStates({ prismaClient, fromBlock: 0, toBlock: 100, chunkBlocks: 10, fetchers, report })
      .catch(error => error)
      .then(outcome => ({ outcome, report }))
  }

  beforeEach(() => {
    sinon.stub(tokenStateRepository, 'insertStatements').returns([{ op: 'token_state_at_block.createMany' }])
    sinon.stub(console, 'log')
  })
  afterEach(() => sinon.restore())

  it('reads its pairs again after a refusal, writes those still missing, and stops without an error when they are already stored', async () => {
    const refusedOnce = sinon.stub().resolves([])
    refusedOnce.onFirstCall().rejects(raceRefusal(1))
    const refusedAlways = sinon.stub().rejects(raceRefusal(1))
    const pairGoneOnTheSecondRead = sinon.stub().resolves([])
    pairGoneOnTheSecondRead.onFirstCall().resolves([pair])

    const retried = await phaseB(refusedOnce, sinon.stub().resolves([pair]))
    const stopped = await phaseB(refusedAlways, pairGoneOnTheSecondRead)

    expect([retried.report.pairsRaced, retried.report.pairsWritten, refusedOnce.callCount]).to.deep.equal([1, 1, 2])
    expect(stopped.outcome).to.equal(stopped.report)
    expect([refusedAlways.callCount, stopped.report.pairsRaced, stopped.report.pairsWritten]).to.deep.equal([1, 1, 0])
  })
})

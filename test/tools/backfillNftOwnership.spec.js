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
  afterEach(() => sinon.restore())

  it('writes a block refused as raced on every attempt 3 times at most, says it reads again only before a retry, then throws the last refusal', async () => {
    const block = { number: 10, hash: '0xa10' }
    const refusals = [1, 2, 3, 4].map(attempt => Object.assign(new Error(`refused on attempt ${attempt}`), { code: 'P2025' }))
    const $transaction = sinon.stub()
    refusals.forEach((refusal, call) => $transaction.onCall(call).rejects(refusal))
    const nextBlocks = sinon.stub().resolves([])
    nextBlocks.onFirstCall().resolves([block])
    const prismaClient = {
      $transaction,
      block: { findMany: nextBlocks, findUnique: sinon.stub().resolves({ number: block.number }) },
      event: { findMany: sinon.stub().resolves([{ blockHash: block.hash, topic0: '0x01', topic1: null, topic2: null, topic3: null }]) },
      token_transfer: { groupBy: sinon.stub().resolves([]), findFirst: sinon.stub().resolves(null) }
    }
    sinon.stub(nftRepository, 'insertStatements').resolves([{ op: 'token_transfer.createMany' }])
    const log = sinon.stub(console, 'log')

    const error = await backfillTransfers({ prismaClient, fromBlock: 0, toBlock: 100, chunkBlocks: 10 }).catch(e => e)
    const readingAgain = log.args.filter(([line]) => String(line).endsWith('Reading again')).length
    log.restore()

    expect(error).to.equal(refusals[2])
    expect($transaction.callCount).to.equal(3)
    expect(readingAgain).to.equal(2)
  })
})

describe('backfillNftOwnership phase B write retries', () => {
  const block = { number: 10, hash: '0xa10' }
  const pair = { contract: '0x00000000000000000000000000000000000e0721', blockNumber: 10, blockHash: block.hash }
  const raced = attempt => Object.assign(new Error(`refused on attempt ${attempt}`), { code: 'P2002' })

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
    sinon.stub(tokenStateRepository, 'insertStatements').returns([{ op: 'token_state_at_block.createMany' }])
    const log = sinon.stub(console, 'log')
    return backfillTokenStates({ prismaClient, fromBlock: 0, toBlock: 100, chunkBlocks: 10, fetchers, report })
      .catch(error => error)
      .then(outcome => { log.restore(); return { outcome, report, readingAgain: log.args.filter(([line]) => String(line).endsWith('reading its pairs again')).length } })
  }

  afterEach(() => sinon.restore())

  it('writes a block\'s pairs refused as raced on every attempt 3 times at most, reads them again only before a retry, then throws the last refusal', async () => {
    const refusals = [1, 2, 3, 4].map(raced)
    const $transaction = sinon.stub()
    refusals.forEach((refusal, call) => $transaction.onCall(call).rejects(refusal))
    const pairReads = sinon.stub().resolves([pair])

    const { outcome, report, readingAgain } = await phaseB($transaction, pairReads)

    expect(outcome).to.equal(refusals[2])
    expect($transaction.callCount).to.equal(3)
    expect(pairReads.callCount).to.equal(3)
    expect([report.pairsRaced, readingAgain]).to.deep.equal([2, 2])
  })

  it('stops without an error when the pairs read again after a refusal are already stored', async () => {
    const $transaction = sinon.stub().rejects(raced(1))
    const pairReads = sinon.stub().resolves([])
    pairReads.onFirstCall().resolves([pair])

    const { outcome, report } = await phaseB($transaction, pairReads)

    expect(outcome).to.equal(report)
    expect([$transaction.callCount, report.pairsRaced, report.pairsWritten]).to.deep.equal([1, 1, 0])
  })
})

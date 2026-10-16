import { expect } from 'chai'
import sinon from 'sinon'
import { backfillTransfers, exitCodeOf } from '../../src/tools/backfillNftOwnership'
import { nftRepository } from '../../src/repositories'

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

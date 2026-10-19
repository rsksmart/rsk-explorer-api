import { expect } from 'chai'
import sinon from 'sinon'
import { Prisma } from '@prisma/client'
import { getBlocksRepository } from '../../src/repositories/blocks.repository'
import { nftRepository, tokenStateRepository } from '../../src/repositories'

const DEADLOCK_PART_OF_THE_PRISMA_6_19_3_MESSAGE = 'PostgresError { code: "40P01", message: "deadlock detected", … }'
const OTHER_QUERY_ERROR = 'PostgresError { code: "57014", message: "canceling statement due to statement timeout", … }'

const unknownRequestError = message => new Prisma.PrismaClientUnknownRequestError(message, { clientVersion: '6.19.3' })

describe('# blocks.repository delete retry', function () {
  let batches
  let repo

  const repositoryRejectingFirstWith = error => {
    batches = 0
    return getBlocksRepository({
      $transaction: () => ++batches === 1 ? Promise.reject(error) : Promise.resolve([]),
      block: {
        findMany: sinon.stub().resolves([{ number: 20, hash: '0xa20' }]),
        delete: args => ({ op: 'block.delete', ...args })
      }
    })
  }

  beforeEach(() => {
    sinon.stub(nftRepository, 'undoStatements').resolves([])
    sinon.stub(tokenStateRepository, 'undoStatements').resolves([])
  })
  afterEach(() => sinon.restore())

  it('retries a batch that Postgres chose as a deadlock victim, which Prisma 6.19.3 raises with no code and this PostgresError text, and deletes the block on the next attempt', async () => {
    repo = repositoryRejectingFirstWith(unknownRequestError(DEADLOCK_PART_OF_THE_PRISMA_6_19_3_MESSAGE))

    const result = await repo.deleteOne({ number: 20 })

    expect(result).to.deep.equal({ count: 1 })
    expect(batches).to.equal(2)
  })

  it('returns a count of 0 when the blocks it pinned are gone by the time it reads them again', async () => {
    const $transaction = sinon.stub().rejects(Object.assign(new Error('refused'), { code: 'P2025' }))
    const findMany = sinon.stub().resolves([])
    findMany.onFirstCall().resolves([{ number: 20, hash: '0xa20' }])
    repo = getBlocksRepository({ $transaction, block: { findMany, delete: args => ({ op: 'block.delete', ...args }) } })

    expect(await repo.deleteOne({ number: 20 })).to.deep.equal({ count: 0 })
    expect($transaction.callCount).to.equal(1)
  })

  it('does not retry another query error that has no Prisma code', async () => {
    repo = repositoryRejectingFirstWith(unknownRequestError(OTHER_QUERY_ERROR))

    const error = await repo.deleteOne({ number: 20 }).catch(e => e)

    expect(error.message).to.include('57014')
    expect(batches).to.equal(1)
  })
})

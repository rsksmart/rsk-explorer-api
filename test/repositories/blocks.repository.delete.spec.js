import { expect } from 'chai'
import sinon from 'sinon'
import { Prisma } from '@prisma/client'
import { getBlocksRepository } from '../../src/repositories/blocks.repository'
import { nftRepository, tokenStateRepository } from '../../src/repositories'

const DEADLOCK_IN_A_BATCH = 'Error in batch request 2: Error occurred during query execution:\nConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "40P01", message: "deadlock detected", severity: "ERROR", detail: Some("Process 87063 waits for ShareLock on transaction 4480265; blocked by process 87028.\\nProcess 87028 waits for ShareLock on transaction 4480266; blocked by process 87063."), column: None, hint: Some("See server log for query details.") }), transient: false })'
const OTHER_QUERY_ERROR = 'Error in batch request 2: Error occurred during query execution:\nConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "57014", message: "canceling statement due to statement timeout", severity: "ERROR", detail: None, column: None, hint: None }), transient: false })'

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

  it('retries a batch that Postgres chose as a deadlock victim, which Prisma raises with no code, and deletes the block on the next attempt', async () => {
    repo = repositoryRejectingFirstWith(unknownRequestError(DEADLOCK_IN_A_BATCH))

    const result = await repo.deleteOne({ number: 20 })

    expect(result).to.deep.equal({ count: 1 })
    expect(batches).to.equal(2)
  })

  it('does not retry another query error that has no Prisma code', async () => {
    repo = repositoryRejectingFirstWith(unknownRequestError(OTHER_QUERY_ERROR))

    const error = await repo.deleteOne({ number: 20 }).catch(e => e)

    expect(error.message).to.include('57014')
    expect(batches).to.equal(1)
  })
})

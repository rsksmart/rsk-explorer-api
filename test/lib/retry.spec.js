import { expect } from 'chai'
import sinon from 'sinon'
import { retry } from '../../src/lib/retry'

const refusal = attempt => Object.assign(new Error(`refused on attempt ${attempt}`), { code: 'P2025' })
const isRetryable = error => error.code === 'P2025'
const refusedOnEveryAttempt = () => {
  const run = sinon.stub()
  for (let attempt = 1; attempt <= 4; attempt++) run.onCall(attempt - 1).rejects(refusal(attempt))
  return run
}

describe('retry', () => {
  it('runs work refused on every attempt 3 times at most, prepares a retry only between attempts, and throws the last refusal', async () => {
    const run = refusedOnEveryAttempt()
    const doneByAnotherWriter = sinon.stub().resolves(false)
    const beforeRetry = sinon.stub().resolves()

    const error = await retry({ maxAttempts: 3, isRetryable, run, doneByAnotherWriter, beforeRetry }).catch(thrown => thrown)

    expect(error.message).to.equal('refused on attempt 3')
    expect(run.callCount).to.equal(3)
    expect(doneByAnotherWriter.callCount).to.equal(3)
    expect(beforeRetry.args.map(([refused, attempt]) => [refused.message, attempt])).to.deep.equal([
      ['refused on attempt 1', 1],
      ['refused on attempt 2', 2]
    ])
  })

  it('returns what the work returns after one refusal', async () => {
    const run = sinon.stub()
    run.onFirstCall().rejects(refusal(1)).onSecondCall().resolves({ count: 1 })

    const result = await retry({ maxAttempts: 3, isRetryable, run })

    expect(result).to.deep.equal({ count: 1 })
    expect(run.callCount).to.equal(2)
  })

  it('rethrows another error at once', async () => {
    const connectionLost = new Error('connection lost')
    const run = sinon.stub().rejects(connectionLost)

    const error = await retry({ maxAttempts: 3, isRetryable, run }).catch(thrown => thrown)

    expect(error).to.equal(connectionLost)
    expect(run.callCount).to.equal(1)
  })

  it('ends without an error when another writer did the work', async () => {
    const run = refusedOnEveryAttempt()

    const result = await retry({ maxAttempts: 3, isRetryable, run, doneByAnotherWriter: async () => true })

    expect(result).to.equal(undefined)
    expect(run.callCount).to.equal(1)
  })
})

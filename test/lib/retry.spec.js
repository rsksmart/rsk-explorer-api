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
    expect([run.callCount, doneByAnotherWriter.callCount]).to.deep.equal([3, 3])
    expect(beforeRetry.args.map(([refused, attempt]) => [refused.message, attempt])).to.deep.equal([['refused on attempt 1', 1], ['refused on attempt 2', 2]])
  })

  it('returns what the work returns after a refusal, rethrows any other error at once, and ends without an error when another writer did the work', async () => {
    const connectionLost = new Error('connection lost')
    const refusedOnce = sinon.stub()
    refusedOnce.onFirstCall().rejects(refusal(1)).onSecondCall().resolves({ count: 1 })
    const failsWithAnotherError = sinon.stub().rejects(connectionLost)
    const alwaysRefused = refusedOnEveryAttempt()

    const outcomes = await Promise.all([
      retry({ maxAttempts: 3, isRetryable, run: refusedOnce }),
      retry({ maxAttempts: 3, isRetryable, run: failsWithAnotherError }).catch(thrown => thrown),
      retry({ maxAttempts: 3, isRetryable, run: alwaysRefused, doneByAnotherWriter: async () => true })
    ])

    expect(outcomes).to.deep.equal([{ count: 1 }, connectionLost, undefined])
    expect([refusedOnce, failsWithAnotherError, alwaysRefused].map(run => run.callCount)).to.deep.equal([2, 1, 1])
  })
})

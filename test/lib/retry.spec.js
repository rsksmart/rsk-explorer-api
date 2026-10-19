import { expect } from 'chai'
import sinon from 'sinon'
import { retry } from '../../src/lib/retry'

const refusal = attempt => Object.assign(new Error(`refused on attempt ${attempt}`), { code: 'P2025' })
const isRetryable = error => error.code === 'P2025'
const refusedOnEveryAttempt = () => {
  const run = sinon.stub()
  ;[1, 2, 3, 4].forEach(attempt => run.onCall(attempt - 1).rejects(refusal(attempt)))
  return run
}

describe('retry', () => {
  it('runs work refused on every attempt 3 times at most, prepares a retry only between attempts, and throws the last refusal', async () => {
    const run = refusedOnEveryAttempt()
    const doneByAnotherWriter = sinon.stub().resolves(false)
    const beforeRetry = sinon.stub().resolves(true)

    const error = await retry({ maxAttempts: 3, isRetryable, run, doneByAnotherWriter, beforeRetry }).catch(e => e)

    expect(error.message).to.equal('refused on attempt 3')
    expect([run.callCount, doneByAnotherWriter.callCount]).to.deep.equal([3, 3])
    expect(beforeRetry.args.map(([refused, attempt]) => [refused.message, attempt])).to.deep.equal([['refused on attempt 1', 1], ['refused on attempt 2', 2]])
  })

  it('returns what the work returns, rethrows any other error at once, and ends without an error when the work is finished elsewhere or nothing is left', async () => {
    const other = new Error('connection lost')
    const runs = [sinon.stub(), sinon.stub().rejects(other), refusedOnEveryAttempt(), refusedOnEveryAttempt()]
    runs[0].onFirstCall().rejects(refusal(1)).onSecondCall().resolves({ count: 1 })

    const outcomes = await Promise.all([
      retry({ maxAttempts: 3, isRetryable, run: runs[0] }),
      retry({ maxAttempts: 3, isRetryable, run: runs[1] }).catch(e => e),
      retry({ maxAttempts: 3, isRetryable, run: runs[2], doneByAnotherWriter: async () => true }),
      retry({ maxAttempts: 3, isRetryable, run: runs[3], beforeRetry: async () => false })
    ])

    expect(outcomes).to.deep.equal([{ count: 1 }, other, undefined, undefined])
    expect(runs.map(run => run.callCount)).to.deep.equal([2, 1, 1, 1])
  })
})

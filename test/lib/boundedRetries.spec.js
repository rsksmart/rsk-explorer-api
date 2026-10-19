import { expect } from 'chai'
import sinon from 'sinon'
import { withBoundedRetries } from '../../src/lib/boundedRetries'

const refusal = attempt => Object.assign(new Error(`refused on attempt ${attempt}`), { code: 'P2025' })
const isRetryable = error => error.code === 'P2025'
const refusedOnEveryAttempt = () => {
  const run = sinon.stub()
  ;[1, 2, 3, 4].forEach(attempt => run.onCall(attempt - 1).rejects(refusal(attempt)))
  return run
}

describe('withBoundedRetries', () => {
  it('runs work refused on every attempt 3 times at most, prepares a retry only between attempts, and throws the last refusal', async () => {
    const run = refusedOnEveryAttempt()
    const finishedElsewhere = sinon.stub().resolves(false)
    const beforeRetry = sinon.stub().resolves(true)

    const error = await withBoundedRetries({ attempts: 3, isRetryable, run, finishedElsewhere, beforeRetry }).catch(e => e)

    expect(error.message).to.equal('refused on attempt 3')
    expect([run.callCount, finishedElsewhere.callCount]).to.deep.equal([3, 3])
    expect(beforeRetry.args.map(([refused, attempt]) => [refused.message, attempt])).to.deep.equal([['refused on attempt 1', 1], ['refused on attempt 2', 2]])
  })

  it('returns what the work returns, rethrows any other error at once, and ends without an error when the work is finished elsewhere or nothing is left', async () => {
    const other = new Error('connection lost')
    const runs = [sinon.stub(), sinon.stub().rejects(other), refusedOnEveryAttempt(), refusedOnEveryAttempt()]
    runs[0].onFirstCall().rejects(refusal(1)).onSecondCall().resolves({ count: 1 })

    const outcomes = await Promise.all([
      withBoundedRetries({ attempts: 3, isRetryable, run: runs[0] }),
      withBoundedRetries({ attempts: 3, isRetryable, run: runs[1] }).catch(e => e),
      withBoundedRetries({ attempts: 3, isRetryable, run: runs[2], finishedElsewhere: async () => true }),
      withBoundedRetries({ attempts: 3, isRetryable, run: runs[3], beforeRetry: async () => false })
    ])

    expect(outcomes).to.deep.equal([{ count: 1 }, other, undefined, undefined])
    expect(runs.map(run => run.callCount)).to.deep.equal([2, 1, 1, 1])
  })
})

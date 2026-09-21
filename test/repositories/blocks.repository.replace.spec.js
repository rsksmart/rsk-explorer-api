import { expect } from 'chai'
import sinon from 'sinon'
import { getBlocksRepository } from '../../src/repositories/blocks.repository'
import {
  addressRepository,
  balancesRepository,
  txRepository,
  txPendingRepository,
  internalTxRepository,
  blockTraceRepository,
  eventRepository,
  tokenRepository,
  summaryRepository
} from '../../src/repositories'

const data = {
  block: { number: 500, miner: '0xminer', hash: '0xcanonical' },
  transactions: [{ hash: '0xtx' }],
  internalTransactions: [],
  events: [],
  tokenAddresses: [],
  addresses: [{ address: '0xaddr' }],
  balances: [],
  latestBalances: { balances: [{ address: '0xaddr', balance: '0', blockNumber: 500 }] },
  status: null
}

describe('# blocks.repository saveBlockData replace', function () {
  let captured
  let repo

  beforeEach(() => {
    captured = null
    repo = getBlocksRepository({ $transaction: (ops) => { captured = ops; return Promise.resolve() } })
    sinon.stub(repo, 'insertOne').callsFake((b) => ({ op: 'block.insert', number: b.number }))
    sinon.stub(repo, 'deleteOne').callsFake((q) => ({ op: 'block.delete', where: q }))
    sinon.stub(addressRepository, 'insertOne').returns([])
    sinon.stub(balancesRepository, 'insertMany').returns([])
    sinon.stub(txRepository, 'insertOne').returns([])
    sinon.stub(txPendingRepository, 'deleteOne').returns({ op: 'txPending.delete' })
    sinon.stub(internalTxRepository, 'insertOne').returns([])
    sinon.stub(blockTraceRepository, 'insertOne').returns({ op: 'blockTrace.insert' })
    sinon.stub(eventRepository, 'insertOne').returns([])
    sinon.stub(tokenRepository, 'insertOne').returns([])
    sinon.stub(summaryRepository, 'insertOne').returns([])
  })

  afterEach(() => sinon.restore())

  it('commits the stale-block removal and the canonical insertion in one transaction, delete first', async () => {
    await repo.saveBlockData(data, { replace: true })

    expect(repo.deleteOne.calledOnceWithExactly({ number: 500 })).to.equal(true)
    expect(captured[0]).to.deep.equal({ op: 'block.delete', where: { number: 500 } })
    const inserts = captured.filter(o => o && o.op === 'block.insert' && o.number === 500)
    expect(inserts).to.have.lengthOf(1)
  })

  it('does not delete when not replacing', async () => {
    await repo.saveBlockData(data)

    expect(repo.deleteOne.called).to.equal(false)
    const deletes = captured.filter(o => o && o.op === 'block.delete')
    expect(deletes).to.have.lengthOf(0)
    expect(captured[0]).to.deep.equal({ op: 'block.insert', number: 500 })
  })
})

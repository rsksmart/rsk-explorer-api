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
  summaryRepository,
  nftRepository,
  tokenStateRepository
} from '../../src/repositories'

const data = {
  block: { number: 500, miner: '0xminer', hash: '0xcanonical' },
  transactions: [{ hash: '0xtx' }],
  internalTransactions: [],
  events: [],
  tokenAddresses: [],
  tokenStates: [],
  addresses: [{ address: '0xaddr' }],
  balances: [],
  latestBalances: { balances: [{ address: '0xaddr', balance: '0', blockNumber: 500 }] },
  status: null
}

const storedBlock = () => ({
  findMany: sinon.stub().resolves([{ number: 500, hash: '0xstale' }]),
  delete: (args) => ({ op: 'block.delete', ...args })
})

describe('# blocks.repository saveBlockData replace', function () {
  let captured
  let repo
  let block

  beforeEach(() => {
    captured = null
    block = storedBlock()
    repo = getBlocksRepository({ $transaction: (ops) => { captured = ops; return Promise.resolve() }, block })
    sinon.stub(repo, 'insertOne').callsFake((b) => ({ op: 'block.insert', number: b.number }))
    sinon.spy(repo, 'deleteOne')
    sinon.stub(nftRepository, 'undoStatements').resolves([{ op: 'nft.undo' }])
    sinon.stub(tokenStateRepository, 'undoStatements').resolves([{ op: 'token.undo' }])
    sinon.stub(nftRepository, 'insertStatements').returns([])
    sinon.stub(tokenStateRepository, 'insertStatements').returns([])
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

    expect(repo.deleteOne.called).to.equal(false)
    expect(nftRepository.undoStatements.calledOnceWithExactly([{ number: 500, hash: '0xstale' }])).to.equal(true)
    expect(captured.slice(0, 3)).to.deep.equal([{ op: 'nft.undo' }, { op: 'token.undo' }, { op: 'block.delete', where: { number: 500, hash: '0xstale' } }])
    const inserts = captured.filter(o => o && o.op === 'block.insert' && o.number === 500)
    expect(inserts).to.have.lengthOf(1)
  })

  it('propagates a transaction failure so the caller keeps the previous block', async () => {
    const failing = getBlocksRepository({ $transaction: () => Promise.reject(new Error('tx failed')), block: storedBlock() })
    sinon.stub(failing, 'insertOne').returns({ op: 'block.insert' })

    let message
    try { await failing.saveBlockData(data, { replace: true }) } catch (err) { message = err.message }

    expect(message).to.equal('tx failed')
  })

  it('does not delete when not replacing', async () => {
    await repo.saveBlockData(data)

    expect(block.findMany.called).to.equal(false)
    const deletes = captured.filter(o => o && o.op === 'block.delete')
    expect(deletes).to.have.lengthOf(0)
    expect(captured[0]).to.deep.equal({ op: 'block.insert', number: 500 })
  })
})

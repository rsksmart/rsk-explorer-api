import { expect } from 'chai'
import sinon from 'sinon'
import { updateDbTipBlock } from '../../src/services/liveSyncer'
import nod3, { nod3Connect } from '../../src/lib/nod3Connect'
import BlockSummary from '../../src/services/classes/BlockSummary'
import * as BlockBalances from '../../src/services/classes/BlockBalances'
import * as blockchainStats from '../../src/lib/getBlockchainStats'
import { blocksRepository, statsRepository } from '../../src/repositories'

const log = { info () {}, error () {}, warn () {}, debug () {} }
const initConfig = { net: { id: '30' } }
const confirmationsThreshold = 120

const hashOf = label => `0x${label.padStart(64, '0')}`
const block = (number, hash, parentHash) => ({ number, hash, parentHash })

function nodeAnswering ({ byNumber, blocks }) {
  const requests = []
  const answer = async (method, [hashOrNumber]) => {
    requests.push({ method, hashOrNumber })
    if (method === 'eth_getBlockByHash') return blocks.find(b => b.hash === hashOrNumber) || null
    if (method === 'eth_getBlockByNumber') return byNumber(Number(hashOrNumber))
    throw new Error(`Unexpected node method ${method}`)
  }
  return { answer, requests }
}

function storeHolding (rows) {
  const stored = new Map(rows.map(row => [row.number, row]))
  sinon.stub(blocksRepository, 'findOne').callsFake(async ({ number }) => stored.get(number) || null)
  sinon.stub(blocksRepository, 'deleteMany').callsFake(async ({ number }) => number.in.forEach(n => stored.delete(n)))
  sinon.stub(blocksRepository, 'saveBlockData').callsFake(async ({ block }) => {
    if (!stored.has(block.number)) stored.set(block.number, { number: block.number, hash: block.hash, parentHash: block.parentHash })
  })
  return stored
}

describe('# liveSyncer stores the block its child points to', function () {
  let originalSkipFormatters
  let blocksBase
  let node

  const connect = chain => {
    node = nodeAnswering(chain)
    nod3.rpc.sendMethod.callsFake(node.answer)
    blocksBase.nod3.rpc.sendMethod.callsFake(node.answer)
  }

  beforeEach(() => {
    originalSkipFormatters = nod3.skipFormatters
    nod3.skipFormatters = true
    sinon.stub(nod3.rpc, 'sendMethod')
    // a second client, so the result never relies on the checker and the inserter sharing one
    blocksBase = { nod3: nod3Connect('http://127.0.0.1:9', { skipFormatters: true }), log, initConfig }
    sinon.stub(blocksBase.nod3.rpc, 'sendMethod')
    sinon.stub(BlockSummary.prototype, 'fetch').callsFake(async function () {
      const block = await this.getBlockData()
      return { block, transactions: [], internalTransactions: [], addresses: [], tokenAddresses: [], events: [] }
    })
    sinon.stub(BlockBalances, 'fetchAddressesBalancesFromNode').resolves({ balances: [], latestBalances: [] })
    sinon.stub(blockchainStats, 'getBlockchainStats').resolves({})
    sinon.stub(statsRepository, 'insertOne').resolves()
  })

  afterEach(() => {
    sinon.restore()
    nod3.skipFormatters = originalSkipFormatters
  })

  it('re-adds each reorganized height with the parent of the block above it, while the node answers numbers from the old chain', async () => {
    const common = block(100, hashOf('c100'), hashOf('c99'))
    const oldChain = [block(101, hashOf('a101'), common.hash), block(102, hashOf('a102'), hashOf('a101'))]
    const newChain = [block(101, hashOf('b101'), common.hash), block(102, hashOf('b102'), hashOf('b101')), block(103, hashOf('b103'), hashOf('b102'))]
    const stored = storeHolding([common, ...oldChain])
    connect({
      blocks: [common, ...oldChain, ...newChain],
      byNumber: number => [common, ...oldChain].find(b => b.number === number) || newChain.find(b => b.number === number)
    })

    await updateDbTipBlock(103, blocksBase, { initConfig, log }, confirmationsThreshold)

    expect([101, 102, 103].map(n => stored.get(n).hash)).to.deep.equal(newChain.map(b => b.hash))
    for (const number of [100, 101, 102]) {
      expect(stored.get(number).hash, `height ${number}`).to.equal(stored.get(number + 1).parentHash)
    }
    expect(node.requests.filter(r => r.method === 'eth_getBlockByNumber').map(r => Number(r.hashOrNumber))).to.deep.equal([103])
  })

  it('re-adds the reorganized heights lowest first, and still adds the heights above one that fails to save', async () => {
    const common = block(100, hashOf('c100'), hashOf('c99'))
    const oldChain = [block(101, hashOf('a101'), common.hash), block(102, hashOf('a102'), hashOf('a101'))]
    const newChain = [block(101, hashOf('b101'), common.hash), block(102, hashOf('b102'), hashOf('b101')), block(103, hashOf('b103'), hashOf('b102'))]
    const stored = storeHolding([common, ...oldChain])
    blocksRepository.saveBlockData.callsFake(async ({ block }) => {
      if (block.number !== 101) stored.set(block.number, { number: block.number, hash: block.hash, parentHash: block.parentHash })
    })
    connect({ blocks: [common, ...oldChain, ...newChain], byNumber: number => newChain.find(b => b.number === number) })

    await updateDbTipBlock(103, blocksBase, { initConfig, log }, confirmationsThreshold)

    expect(blocksRepository.saveBlockData.args.map(([data]) => data.block.number)).to.deep.equal([101, 101, 101, 102, 103])
    expect(stored.has(101)).to.equal(false)
    expect([102, 103].map(n => stored.get(n).hash)).to.deep.equal([newChain[1].hash, newChain[2].hash])
  })

  it('stores the tip block whose parentHash it checked, even when a second request by number returns another block', async () => {
    const parent = block(100, hashOf('c100'), hashOf('c99'))
    const checked = block(101, hashOf('a101'), parent.hash)
    const other = block(101, hashOf('b101'), parent.hash)
    const stored = storeHolding([parent])
    let byNumberRequests = 0
    connect({ blocks: [parent, checked, other], byNumber: () => (byNumberRequests++ === 0 ? checked : other) })

    await updateDbTipBlock(101, blocksBase, { initConfig, log }, confirmationsThreshold)

    expect(stored.get(101).hash).to.equal(checked.hash)
    expect(node.requests).to.deep.include({ method: 'eth_getBlockByHash', hashOrNumber: checked.hash })
  })

  it('logs the full hashes it compares, and of each block it queues and saves', async () => {
    const common = block(100, hashOf('c100'), hashOf('c99'))
    const stale = block(101, hashOf('a101'), common.hash)
    const newChain = [block(101, hashOf('b101'), common.hash), block(102, hashOf('b102'), hashOf('b101'))]
    storeHolding([common, stale])
    connect({ blocks: [common, stale, ...newChain], byNumber: number => newChain.find(b => b.number === number) })
    const lines = []

    await updateDbTipBlock(102, blocksBase, { initConfig, log: { ...log, info: line => lines.push(line) } }, confirmationsThreshold)

    const lineWith = text => lines.find(line => line.includes(text)) || ''
    expect(lineWith('is incongruent')).to.include(stale.hash).and.include(newChain[1].parentHash)
    expect(lines).to.include(`Block 101: db has ${stale.hash}, new chain has ${newChain[0].hash}. Queued for the new chain.`)
    expect(lineWith('Adding new chain blocks')).to.include(newChain[0].hash).and.include(newChain[1].hash)
    for (const { number, hash } of newChain) {
      expect(lineWith(`Block ${number} (${hash}) saved`), `height ${number}`).to.not.equal('')
    }
  })

  it('logs "none" as the db hash of a queued height that has no row', async () => {
    const common = block(100, hashOf('c100'), hashOf('c99'))
    const stale = block(102, hashOf('a102'), hashOf('a101'))
    const newChain = [block(101, hashOf('b101'), common.hash), block(102, hashOf('b102'), hashOf('b101')), block(103, hashOf('b103'), hashOf('b102'))]
    storeHolding([common, stale])
    connect({ blocks: [common, stale, ...newChain], byNumber: number => newChain.find(b => b.number === number) })
    const lines = []

    await updateDbTipBlock(103, blocksBase, { initConfig, log: { ...log, info: line => lines.push(line) } }, confirmationsThreshold)

    expect(lines).to.include(`Block 101: db has none, new chain has ${newChain[0].hash}. Queued for the new chain.`)
  })

  it('stops before deleting any row when the node has no block for a parentHash, and names that hash', async () => {
    const common = block(100, hashOf('c100'), hashOf('c99'))
    const stale = block(101, hashOf('a101'), common.hash)
    const tip = block(102, hashOf('b102'), hashOf('b101'))
    const stored = storeHolding([common, stale])
    connect({ blocks: [common, stale, tip], byNumber: () => tip })

    const error = await updateDbTipBlock(102, blocksBase, { initConfig, log }, confirmationsThreshold).catch(err => err)

    expect(error).to.be.an('error').with.property('message').that.includes(tip.parentHash)
    expect(blocksRepository.deleteMany.called).to.equal(false)
    expect([...stored.values()]).to.deep.equal([common, stale])
  })

  it('ends with the canonical block across two reorgs in a row at one height, while the node answers that height by number with a sibling', async () => {
    const common = block(100, hashOf('c100'), hashOf('c99'))
    const sibling = block(101, hashOf('a101'), common.hash)
    const firstChain = [block(101, hashOf('b101'), common.hash), block(102, hashOf('b102'), hashOf('b101'))]
    const secondChain = [block(101, hashOf('d101'), common.hash), block(102, hashOf('d102'), hashOf('d101')), block(103, hashOf('d103'), hashOf('d102'))]
    const stored = storeHolding([common, sibling])
    const blocks = [common, sibling, ...firstChain, ...secondChain]
    connect({ blocks, byNumber: number => (number === 101 ? sibling : firstChain.find(b => b.number === number)) })
    await updateDbTipBlock(102, blocksBase, { initConfig, log }, confirmationsThreshold)
    expect([101, 102].map(n => stored.get(n).hash)).to.deep.equal(firstChain.map(b => b.hash))

    connect({ blocks, byNumber: number => (number === 101 ? sibling : secondChain.find(b => b.number === number)) })
    await updateDbTipBlock(103, blocksBase, { initConfig, log }, confirmationsThreshold)

    expect([100, 101, 102, 103].map(n => stored.get(n).hash)).to.deep.equal([common, ...secondChain].map(b => b.hash))
    for (const number of [100, 101, 102]) {
      expect(stored.get(number).hash, `height ${number}`).to.equal(stored.get(number + 1).parentHash)
    }
  })
})

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
    expect(lineWith('now belongs to an old chain')).to.include(stale.hash).and.include(newChain[0].hash)
    expect(lineWith('Adding new chain blocks')).to.include(newChain[0].hash).and.include(newChain[1].hash)
    for (const { number, hash } of newChain) {
      expect(lineWith(`Block ${number} (${hash}) saved`), `height ${number}`).to.not.equal('')
    }
  })

  it('replays 2026-10-22: block 9347554 ends as 0xb2a69626…, not the old-chain 0xe6b0ad5b…', async () => {
    // real hashes from the incident logs; 9347553 keeps its real prefix only, 9347556 is made up
    const h9347553 = `0x9a5d2609${'0'.repeat(56)}`
    const canonical9347554 = '0xb2a696268dfbc8d1f8c4ae4743f9441661db6afcce799d341a9ee2b50573591c'
    const oldChain9347554 = '0xe6b0ad5b665cadfccd5aa3575090ad6f91936a594252d92abe2b134edd73fdc9'
    const h9347555 = '0x112ea225e115296a35b96886ba5bb253185c8aa072e3606f513529f536334bde'
    const h9347556 = hashOf('9347556')
    const chain = [
      block(9347553, h9347553, hashOf('9347552')),
      block(9347554, canonical9347554, h9347553),
      block(9347555, h9347555, canonical9347554),
      block(9347556, h9347556, h9347555)
    ]
    const uncle = block(9347554, oldChain9347554, h9347553)
    const stored = storeHolding([chain[0], uncle])
    let requestsFor9347554 = 0
    // the node answers 9347554 by number with the old-chain block once, on the second request
    const byNumber = number => {
      if (number === 9347554 && ++requestsFor9347554 === 2) return uncle
      return chain.find(b => b.number === number)
    }
    connect({ blocks: [...chain, uncle], byNumber })

    await updateDbTipBlock(9347555, blocksBase, { initConfig, log }, confirmationsThreshold)
    await updateDbTipBlock(9347556, blocksBase, { initConfig, log }, confirmationsThreshold)

    expect(stored.get(9347554).hash).to.equal(canonical9347554)
    expect([9347553, 9347554, 9347555, 9347556].map(n => stored.get(n).hash)).to.deep.equal(chain.map(b => b.hash))
  })
})

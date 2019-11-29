import { missmatchBlockTransactions } from '../../src/services/classes/Block'
import { assert } from 'chai'

import blockA from './blockData/block-1234.json'
import blockB from './blockData/block-4567.json'
import badBlock from './blockData/block-badTxs.json'

import one from './01.json'
import two from './02.json'

const txs = [
  { hash: '0x1', blockHash: '0xabc123', receipt: { blockHash: '0xabc123' } },
  { hash: '0x2', blockHash: '0xcccccc', receipt: { blockHash: '0xabc123' } },
  { hash: '0x3', blockHash: '0xabc123', receipt: { blockHash: '0xaaaaa' } }
]

describe('# missmatchBlockTransactions', function () {
  it('sholud return 0 bad txs', () => {
    const block = one.result
    const transactions = two.result.transactions.map(
      tx => {
        const { blockHash } = tx
        tx.receipt = { blockHash }
        return tx
      })
    let res = missmatchBlockTransactions(block, transactions)
    assert.isArray(res, true)
    assert.equal(res.length, 0)
  })

  it('should return 1 bad tx', function () {
    let res = missmatchBlockTransactions(badBlock.block.block, badBlock.block.txs)
    assert.isArray(res, true)
    assert.equal(res.length, 1)
  })

  it('should return an empty array', function () {
    let res = missmatchBlockTransactions(blockA.block.block, blockA.block.txs)
    assert.isArray(res, true)
    assert.equal(res.length, 0)
  })

  it('should return an empty array', function () {
    let res = missmatchBlockTransactions(blockB.block.block, blockB.block.txs)
    assert.isArray(res, true)
    assert.equal(res.length, 0)
  })

  it('should return an empty array', function () {
    let res = missmatchBlockTransactions({ hash: '0xabc123', transactions: ['0x1'] }, [txs[0]])
    assert.isArray(res, true)
    assert.equal(res.length, 0)
  })

  it('should return 2 bad txs', function () {
    let res = missmatchBlockTransactions({ hash: '0xabc123', transactions: ['0x1', '0x2'] }, txs)
    assert.isArray(res, true)
    assert.equal(res.length, 2)
    let expect = [txs[1], txs[2]]
    assert.deepEqual(res, expect)
  })

  it('should return 1 bad tx', function () {
    let res = missmatchBlockTransactions({ hash: '0xabc123', transactions: ['0x1', '0x3'] }, [txs[0], txs[2]])
    assert.isArray(res, true)
    assert.equal(res.length, 1)
    assert.deepEqual(res, [txs[2]])
  })
  it('should return 3 bad tx', function () {
    let res = missmatchBlockTransactions({ hash: '0x456', transactions: ['0x1', '0x2', '0x3'] }, txs)
    assert.isArray(res, true)
    assert.equal(res.length, 3)
    assert.deepEqual(res, txs)
  })
})

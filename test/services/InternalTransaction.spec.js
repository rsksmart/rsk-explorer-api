import { expect } from 'chai'
import { getInternalTxId } from '../../src/services/classes/InternalTx'
import b1 from './blockData/block-3516.json'
import b2 from './blockData/block-798248.json'

let blocks = [b1, b2]

describe(`# Internal Transactions`, function () {
  for (let blockData of blocks) {
    let { internalTransactions } = blockData.block
    let { number } = blockData.block.block

    describe(`# InternalTransaction block ${number}`, function () {
      describe('ids', function () {
        it(`should return unique ids`, () => {
          let ids = internalTransactions.map(itx => getInternalTxId(itx))
          expect([...new Set(ids)].length).to.be.equal(ids.length)
        })
      })
    })
  }
})

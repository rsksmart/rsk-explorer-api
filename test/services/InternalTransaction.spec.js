import { expect, assert } from 'chai'
import { getInternalTxId, filterValueAddresses } from '../../src/services/classes/InternalTx'
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

      describe('filterValueAddresses', function () {
        it(`should return addresses that transferred some value`, () => {
          let valueAddresses = filterValueAddresses(internalTransactions)
          assert.typeOf(valueAddresses, 'array')
          let itxsAddresses = internalTransactions.filter(itx => {
            let { action, error } = itx
            let { value } = action
            return parseInt(value) && !error
          }).map(({ action, _index }) => { return { addresses: [action.from, action.to], _index } })
          const addresses = [...new Set(itxsAddresses.map(({ addresses }) => addresses).reduce((v, a) => v.concat(a), []))]
          assert.includeDeepMembers(valueAddresses, addresses)
        })
      })
    })
  }
})

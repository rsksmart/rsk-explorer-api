import { expect } from 'chai'
import { randomAddress, randomBlockHash } from '../shared'
import { fields } from '../../src/lib/types'
import Address from '../../src/services/classes/Address'

describe(`# Address`, function () {
  describe(`lastBlock`, function () {
    const a = randomAddress()
    const address = new Address(a, { collections: { Addr: null } })
    let data = address.getData()

    it(`lastBlock should be undefined`, () => {
      expect(data[fields.LAST_BLOCK_MINED]).to.be.equal(undefined)
    })

    const block = {
      number: 12,
      hash: randomBlockHash(),
      miner: a,
      transactions: []
    }
    it(`${fields.LAST_BLOCK_MINED} should be equal to block`, () => {
      address.setBlock(block)
      const data = address.getData()
      expect(data[fields.LAST_BLOCK_MINED]).to.be.deep.equal(block)
    })

    it(`${fields.LAST_BLOCK_MINED} should be block`, () => {
      address.setBlock({ number: 2, hash: randomBlockHash(), miner: a, transactions: [] })
      const data = address.getData()
      expect(data[fields.LAST_BLOCK_MINED]).to.be.deep.equal(block)
    })

    it(`${fields.LAST_BLOCK_MINED} should be block`, () => {
      address.setBlock({ number: 200, hash: randomBlockHash(), miner: randomAddress(), transactions: [] })
      const data = address.getData()
      expect(data[fields.LAST_BLOCK_MINED]).to.be.deep.equal(block)
    })

    it(`${fields.LAST_BLOCK_MINED} should be block`, () => {
      const test = { number: 200, hash: randomBlockHash(), miner: a, transactions: [] }
      address.setBlock(test)
      const data = address.getData()
      expect(data[fields.LAST_BLOCK_MINED]).to.be.deep.equal(test)
    })
  })
})

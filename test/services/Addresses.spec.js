import { expect } from 'chai'
import { BlockAddresses } from '../../src/services/classes/BlockAddresses'
import { fakeAddress, testCollections, fakeBlock } from '../shared'

const findAddress = address => data.find(a => a.address === address)
const nod3 = {
  eth: {
    getBalance: (a) => {
      return findAddress(a).balance
    },
    getCode: (a) => null
  }
}
const block = fakeBlock()
const initConfig = {}
let data = [...Array(10)].map(() => fakeAddress()).map(a => {
  a.blockNumber = block.number
  return a
})

describe(`# Addresses`, function () {
  describe(`fetch`, function () {
    let addresses = new BlockAddresses(block, { initConfig, nod3 })
    data.forEach(({ address }) => addresses.add(address))
    it(`should fetch all addresses`, async () => {
      let result = await addresses.fetch()
      expect(result).to.be.deep.equal(data)
    })
  })
  describe(`save`, function () {
    it(`should save addresses`, async () => {
      let collections = await testCollections()
      let addresses = new BlockAddresses(block, { initConfig, nod3, collections })
      data.forEach(({ address }) => addresses.add(address, { block }))
      let result = await addresses.save()
      expect(result.find(r => r.ok !== 1)).to.be.equal(undefined)
    })
  })
})

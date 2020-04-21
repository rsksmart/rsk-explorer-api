import { expect } from 'chai'
import Addresses from '../../src/services/classes/Addresses'
import { fakeAddress, testCollections } from '../shared'

const findAddress = address => data.find(a => a.address === address)
const nod3 = {
  eth: {
    getBalance: (a) => {
      return findAddress(a).balance
    },
    getCode: (a) => null
  }
}
const initConfig = {}
let data = [...Array(10)].map(() => fakeAddress())

describe(`# Addresses`, function () {
  describe(`fetch`, function () {
    let addresses = new Addresses({ initConfig, nod3 })
    data.forEach(({ address }) => addresses.add(address))
    it(`should fetch all addresses`, async () => {
      let result = await addresses.fetch()
      expect(result).to.be.deep.equal(data)
    })
  })
  describe(`save`, function () {
    it(`should save addresses`, async () => {
      let collections = await testCollections()
      let addresses = new Addresses({ initConfig, nod3, collections })
      data.forEach(({ address }) => addresses.add(address))
      let result = await addresses.save()
      expect(result.find(r => r.ok !== 1)).to.be.equal(undefined)
    })
  })
})

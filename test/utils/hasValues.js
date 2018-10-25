import { hasValues } from '../../src/lib/utils'
import { expect } from 'chai'

const search = ['one', 'two', 'three']
const success = [
  ['one', 'two', 'three'],
  ['one', 'two', 'three', 'apple'],
  ['one', 'three', 'two']
]
const fail = [
  ['one'],
  ['one', 'two', 'apple'],
  ['one', 'two'],
  ['animal', 'tree']
]

describe(`# hasValues ${search}`, function () {
  success.forEach(t => {
    it(`${t} should be true`, function () {
      expect(hasValues(t, search)).to.be.equal(true)
    })
    fail.forEach(t => {
      it(`${t} should be false`, function () {
        expect(hasValues(t, search)).to.be.equal(false)
      })
    })
  })
})

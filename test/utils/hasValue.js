import { hasValue } from '../../src/lib/utils'
import { expect } from 'chai'

const arr = ['one', 'two', 'three']
const success = [
  ['one', 'two', 'three'],
  ['one', 'two', 'three', 'apple'],
  ['three']
]
const fail = [
  ['apple'],
  ['orange', 'apple'],
  ['animal', 'banana']
]

describe(`# hasValue ${arr}`, function () {
  success.forEach(t => {
    it(`${t} should be true`, function () {
      expect(hasValue(arr, t)).to.be.equal(true)
    })
    fail.forEach(t => {
      it(`${t} should be false`, function () {
        expect(hasValue(arr, t)).to.be.equal(false)
      })
    })
  })
})

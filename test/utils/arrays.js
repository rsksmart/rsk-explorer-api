import { arrayIntersection, arraySymmetricDifference, arrayDifference } from '../../src/lib/utils'
import { assert } from 'chai'

const a = [1, 2, 3, 4]
const b = [1, 3]
const aa = [3, 1, 4, 2]
const c = [5, 6]
const d = [4, 5, 6]

describe(`# arrayIntersection`, function () {
  let cases = [
    [a, b, [1, 3]],
    [b, c, []],
    [a, aa, [1, 2, 3, 4]]
  ]
  cases.forEach(ca => {
    it(`${ca[0]} ∩ ${ca[1]} -> ${ca[2]}`, function () {
      assert.deepEqual(arrayIntersection(ca[0], ca[1]), ca[2])
    })
  })
})

describe(`# arrayDifference`, function () {
  let cases = [
    [a, b, [2, 4]],
    [b, c, [1, 3]],
    [a, aa, []],
    [a, aa, []],
    [aa, a, []],
    [d, c, [4]],
    [a, d, [1, 2, 3]]
  ]
  cases.forEach(ca => {
    it(`${ca[0]} - ${ca[1]} -> ${ca[2]}`, function () {
      assert.deepEqual(arrayDifference(ca[0], ca[1]), ca[2])
    })
  })
})

describe(`# arraySymmetricDifference`, function () {
  let cases = [
    [a, b, [2, 4]],
    [b, c, [1, 3, 5, 6]],
    [a, aa, []],
    [a, aa, []],
    [aa, a, []],
    [d, c, [4]],
    [a, d, [1, 2, 3, 5, 6]]
  ]
  cases.forEach(ca => {
    it(`${ca[0]} - ${ca[1]} -> ${ca[2]}`, function () {
      assert.deepEqual(arraySymmetricDifference(ca[0], ca[1]), ca[2])
    })
  })
})

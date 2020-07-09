import { assert } from 'chai'
import { quantityMarks } from '../../src/lib/utils'

const test = [
  [1000, 10, 100],
  [3, 2, 1],
  [undefined, undefined, 0],
  [null, null, 0],
  [1000, null, 0],
  [null, 2, 0],
  [5, 5, 1]
]

describe('quantityMarks()', function () {
  for (let [a, b, expected] of test) {
    let marks = quantityMarks(a, b)
    it(`'${marks}' should be a string`, () => {
      assert.typeOf(marks, 'string')
    })

    it(`${a},${b} should return ${expected} marks`, () => {
      assert.equal(marks.length, expected)
    })
  }
})

import { isObj } from '../../src/lib/utils'
import { assert } from 'chai'

let test = [
  [{}, true],
  [[], false],
  [null, false],
  [false, false],
  [true, false],
  [{ test: 'a' }, true],
  [0, false],
  [10, false],
  ['test', false],
  [undefined, false],
  [{ a: { b: 1 } }, true]
]
describe(`isObj()`, function () {
  for (let t of test) {
    let [value, expected] = t
    it(`${JSON.stringify(value)} should be ${expected}`, () => {
      assert.deepEqual(isObj(value), expected)
    })
  }
})
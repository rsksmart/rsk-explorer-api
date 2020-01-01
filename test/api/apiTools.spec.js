import { sanitizeQuery } from '../../src/api/lib/apiTools'
import { assert } from 'chai'

describe('# API tools', function () {

  describe('sanitizeQuery()', function () {
    const test = [
      [{ test: 'test' }, { test: 'test' }],
      [{ $test: 'test' }, null],
      [{ test: { $test: 'test' } }, { test: null }],
      [{ t: { a: { b: { $p: 0 } } } }, { t: { a: { b: null } } }]
    ]
    for (let t of test) {
      let [value, expected] = t
      it(`${JSON.stringify(value)} should be ${JSON.stringify(expected)}`, () => {
        assert.deepEqual(sanitizeQuery(value), expected)
      })
    }
  })
})

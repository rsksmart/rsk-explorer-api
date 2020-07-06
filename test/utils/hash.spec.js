import { hash } from '../../src/lib/utils'
import { assert } from 'chai'

const obj = {
  a: undefined,
  b: null,
  c: 123,
  d: {
    foo: 'foo',
    bar: 'baz'
  }
}
describe('hash', function () {

  it('the results length should always be the same', () => {
    let res = [...new Set(['abc', obj, null, 123].map(x => hash(x)).map(h => h.length))]
    assert.isTrue(Array.isArray(res))
    assert.isTrue(res.length === 1)
  })

  it('should return the same hash for the same object', () => {
    const o1 = { a: 1, b: 1234, c: null }
    const o2 = { a: 1, b: 1234, c: null }
    assert.notEqual(o1, o2)
    assert.deepEqual(o1, o2)
    assert.deepEqual(hash(o1), hash(o2))
  })

  it('should return different hashes for different objects', () => {
    const obj2 = Object.assign({}, obj)
    assert.notEqual(obj, obj2)
    assert.deepEqual(obj, obj2)
    assert.deepEqual(hash(obj), hash(obj2))
    obj2.a = 'test'
    assert.notDeepEqual(obj, obj2)
    assert.notDeepEqual(hash(obj), hash(obj2))
  })
})

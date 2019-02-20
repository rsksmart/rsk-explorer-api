import { assert } from 'chai'
import { atob, btoa, jsonEncode, jsonDecode } from '../../src/lib/utils'

const obj = {
  a: 1,
  b: 2,
  c: [1, 2, 3, 4, 5],
  d: {
    a: [1, 2, 3]
  }
}

const string = 'aksjad0349##@##@- 23-232kds ñ)(2#@$'

describe('# btoa', () => {
  it('should encode as base64 string', () => {
    const base64 = btoa(string)
    assert.typeOf(base64, 'string')
  })
})

describe('# atob', () => {
  it('should decode base64 string', () => {
    const decodedString = atob(btoa(string))
    assert.equal(string, decodedString)
  })
})

describe('# jsonEncode', () => {
  it('should encode object as  base64 string', () => {
    assert.typeOf(jsonEncode(obj), 'string')
  })
})

describe('# jsonDecode', () => {
  it('should decode encoded string', () => {
    assert.deepEqual(jsonDecode(jsonEncode(obj)), obj)
  })
})

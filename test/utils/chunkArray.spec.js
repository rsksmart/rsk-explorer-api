import { assert } from 'chai'
import { chunkArray } from '../../src/lib/utils'

describe('chunkArray', function () {

  it('should split an array', () => {
    const arr = [...Array(99)].map(() => Math.random())
    const chunks = chunkArray(arr, 10)
    assert.equal(chunks.length, 10)
    assert.equal(chunks[9].length, 9)
  })

  it('should return one chunk', () => {
    const arr = [...Array(99)].map(() => Math.random())
    const chunks = chunkArray(arr, 99)
    assert.equal(chunks.length, 1)
    assert.equal(chunks[0].length, 99)
  })

  it('should return one chunk', () => {
    const arr = [...Array(10)].map(() => Math.random())
    const chunks = chunkArray(arr, 99)
    assert.equal(chunks.length, 1)
    assert.equal(chunks[0].length, 10)
  })
})
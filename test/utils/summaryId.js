import { getSummaryId } from '../../src/lib/ids'
import { fakeBlocks } from '../shared'
import { assert } from 'chai'

const sortBlocks = (field) => (a, b) => b[field] < a[field]

const addIds = blocks => blocks.map(block => {
  block.id = getSummaryId(block)
  return block
})

let blocks = fakeBlocks(20, { addTimestamp: true })
const block = Object.assign({}, blocks[0])
block.timestamp = block.timestamp + 1
blocks.push(block)
blocks = addIds(blocks)

describe('# summary id', () => {
  it('should be sortered', () => {
    const byNumber = [...blocks].sort(sortBlocks('number'))
    const byId = [...blocks].sort(sortBlocks('id'))
    assert.deepEqual(byId, byNumber)
  })
})

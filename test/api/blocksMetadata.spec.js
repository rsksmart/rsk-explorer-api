import { expect } from 'chai'
import { addMetadataToBlocks, BLOCK_METADATA_FIELD } from '../../src/api/lib/blocksMetadata'
import { randomBlockHash } from '../shared'

const blocks = Array(10).fill(0).map((b, i) => {
  let number = i
  let timestamp = Date.now() + 3000
  let difficulty = 0
  let transactions = Array(Math.floor(Math.random() * 10) + 1).fill(randomBlockHash())
  return { number, timestamp, difficulty, transactions }
})

describe(`addMetadataToBlocks()`, function () {
  let newBlocks = addMetadataToBlocks(blocks)

  it(`newblocks.length should be blocks.length-1`, () => {
    expect(newBlocks.length).to.be.equal(blocks.length - 1)
  })

  it(`blocks should have a metadata field`, () => {
    expect([...new Set(newBlocks.map(b => !!b[BLOCK_METADATA_FIELD]))]).to.be.deep.equal([true])
  })

  let i = 1
  for (let block of newBlocks) {
    let metadata = block[BLOCK_METADATA_FIELD]
    let { txDensity, time } = metadata
    let prevBlock = blocks[i - 1]
    it(`blocks metadata time`, () => {
      expect(time).to.be.equal(block.timestamp - prevBlock.timestamp)
    })
    it(`txDensity`, () => {
      expect(txDensity).to.be.equal(block.transactions.length / time)
    })

    i++
  }
})

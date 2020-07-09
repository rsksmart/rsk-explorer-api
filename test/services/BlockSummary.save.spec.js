import { expect } from 'chai'
import { saveBlockSummary } from '../../src/services/classes/BlockSummary'
import blocks from './blockData'
import { testCollections } from '../shared'

describe(`# BlockSummary save`, function () {
  let block = blocks[0].block
  saveBlock(block, 'save')
  saveBlock(block, 'update')
})

function saveBlock (data, msg = 'save') {
  let { number } = data.block
  describe(`${msg} ${number}`, function () {
    this.timeout(60000)
    it(`should save a blockSummary`, async () => {
      const collections = await testCollections()
      let { result } = await saveBlockSummary(data, collections, console).catch(err => console.log(err))
      expect(result.ok).to.be.equal(1)
    })
  })
}

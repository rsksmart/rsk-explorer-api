import { expect } from 'chai'
import { saveBlockSummary, BlockSummary } from '../../src/services/classes/BlockSummary'
import blocks from './blockData'
import { testCollections, fakeAddress, initConfig } from '../shared'
import { nod3 } from '../../src/lib/nod3Connect'

const block = blocks[0].block

describe(`# BlockSummary save`, function () {

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

describe(' BlockSummary parent addresses', function () {
  it('should contain all addresses', async () => {
    const fakeParent = JSON.parse(JSON.stringify(block))
    const collections = await testCollections()
    let { addresses } = fakeParent
    const fAddresses = [...new Array(5)].map(() => fakeAddress())
    fakeParent.addresses = addresses.concat(fAddresses)
    await saveBlockSummary(fakeParent, collections)
    const summary = new BlockSummary(block.block.hash, { collections, initConfig, nod3 })
    let data = await summary.fetch()
    expect(data.addresses.map(({ address }) => address)).to.include.members(fAddresses.map(({ address }) => address))
  })
})

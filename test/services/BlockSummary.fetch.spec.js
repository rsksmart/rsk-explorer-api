import { expect } from 'chai'
import BlockSummary from '../../src/services/classes/BlockSummary'
import blocks from './blockData'
import { nod3 } from '../../src/lib/nod3Connect'
import { isHexString } from '@rsksmart/rsk-utils'
import { testCollections, initConfig } from '../shared'
import block03 from './blockData/03.json'

describe(`# BlockSummary fetch`, function () {
  for (let { block } of blocks) {
    let summaryData
    let { hash } = block.block
    describe(`Getting summary ${hash}`, function () {
      this.timeout(60000)

      it(`should fetch block`, async () => {
        let collections = await testCollections(true)
        let summary = new BlockSummary(hash, { nod3, initConfig, collections })
        summaryData = await summary.fetch()
        expect(typeof summaryData).to.be.equal('object')
      })

      for (let p in block) {
        it(`should have a ${p} property`, () => {
          expect(summaryData).to.have.ownProperty(p)
        })
      }

      it(`should have all transactions`, () => {
        expect(block.transactions).to.be.deep.equal(summaryData.transactions)
      })

      it(`should have all addresses`, () => {
        let ba = getAddresses(block.addresses)
        let sa = getAddresses(summaryData.addresses)
        expect(sa).to.include.members(ba)
      })

      it('tokenAddresses', () => {
        let ba = getAddresses(block.tokenAddresses)
        let sa = getAddresses(summaryData.tokenAddresses)
        expect(sa).to.include.members(ba)
        for (let { balance } of summaryData.tokenAddresses) {
          expect(typeof balance).to.be.equal('string')
          expect(isHexString(balance)).to.be.equal(true)
        }
      })

      it('events', () => {
        expect(block.events).to.be.deep.equal(summaryData.events)
      })
    })
  }
})

describe('# BlockSummary Events', function () {
  for (let { result: blockData } of [block03]) {
    const { hash } = blockData
    it('events', async () => {
      let collections = await testCollections(true)
      let summary = new BlockSummary(hash, { nod3, initConfig, collections })
      let summaryData = await summary.fetch()
      expect(summaryData.events).to.deep.equal(summaryData.events.filter(e => Object.keys(e).length))
    })
  }
})

function getAddresses (arr) {
  return arr.map(({ address }) => address)
}

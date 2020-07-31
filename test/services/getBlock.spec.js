
import { expect } from 'chai'
import { Block } from '../../src/services/classes/Block'
import { BlocksBase } from '../../src/lib/BlocksBase'
import { nod3 } from '../../src/lib/nod3Connect'
import blocks from './blockData'
import { initConfig, testDb } from '../shared'

const { getDb } = testDb()

for (let b of blocks) {
  let blockSpec = b.block
  let blockNumber = blockSpec.block.number
  describe(`Get Block ${blockNumber}`, function () {
    let blockData
    it('should be connected to RSK testnet', async function () {
      let net = await nod3.net.version()
      expect(net.id).to.be.equal('31')
    })
    it(`should get block ${blockNumber}`, async function () {
      this.timeout(60000)
      const db = await getDb()
      let block = new Block(blockNumber, new BlocksBase(db, { initConfig }))
      await block.fetch()
      blockData = block.getData(true)
      expect(blockData).to.be.an('object')
    })

    it('should have block properties', function () {
      expect(Object.keys(blockData)).to.be.deep.equal(Object.keys(blockSpec))
    })

    for (let p of ['transactions', 'internalTransactions', 'addresses']) {
      it(`${p} length`, () => {
        expect(blockData[p].length).to.be.deep.equal(blockSpec[p].length)
      })
    }

    for (let p of ['addresses', 'transactions', 'internalTransactions']) {
      it(`${p} should have expected addresses`, () => {
        expect(getAddresses(blockSpec[p])).to.be.deep.equal(getAddresses(blockData[p]))
      })
    }

    for (let p of ['transactions', 'internalTransactions']) {
      it(`${p} should be equal to expected`, () => {
        expect(blockSpec[p]).to.be.deep.equal(blockData[p])
      })
    }

    it(`tokenAddresses`, function () {
      expect(blockData.tokenAddresses.length).to.be.equal(blockSpec.tokenAddresses.length)
    })

    for (let k = 0; k < blockSpec.tokenAddresses.length; k++) {
      for (let p of ['address', 'contract', 'balance']) {
        it(`should have ${p} property`, () => {
          expect(blockData.tokenAddresses[k]).has.property(p)
        })

        it('should have expected values', function () {
          expect(blockData.tokenAddresses[k].address).to.be.equal(blockSpec.tokenAddresses[k].address)
          expect(blockData.tokenAddresses[k].contract).to.be.equal(blockSpec.tokenAddresses[k].contract)
        })
      }
    }
  })
}

function getAddresses (arr) {
  return arr.map(({ address }) => address).sort()
}

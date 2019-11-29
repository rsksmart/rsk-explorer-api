
import { expect } from 'chai'
import { Block } from '../../src/services/classes/Block'
import { BlocksBase } from '../../src/lib/BlocksBase'
import { nod3 } from '../../src/lib/nod3Connect'
import datasource from '../../src/lib/dataSource'

import blockJson from './blockData/block-3516.json'
const blockSpec = blockJson.block

describe('Get Block', function () {
  let blockData
  let blockNumber = blockSpec.block.number
  it('should be connected to RSK testnet', async function () {
    let net = await nod3.net.version()
    expect(net.id).to.be.equal('31')
  })
  it(`should get block ${blockNumber}`, async function () {
    this.timeout(60000)
    let { db, initConfig } = await datasource()
    let block = new Block(blockNumber, new BlocksBase(db, { initConfig }))
    await block.fetch()
    blockData = block.getData(true)
    expect(blockData).to.be.an('object')
  })

  it('should have block properties', function () {
    expect(Object.keys(blockData)).to.be.deep.equal(Object.keys(blockSpec))
  })

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

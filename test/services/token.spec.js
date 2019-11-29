
import { expect } from 'chai'
import { Block } from '../../src/services/classes/Block'
import { BlocksBase } from '../../src/lib/BlocksBase'
import { nod3 } from '../../src/lib/nod3Connect'
import datasource from '../../src/lib/dataSource'
import initConfig from '../../src/lib/initialConfiguration'

const tokens = [
  {
    blockNumber: 27941,
    expected: {
      contractInterfaces: ['ERC165', 'ERC721', 'ERC721Enumerable', 'ERC721Metadata'],
      name: 'Test721',
      symbol: 'TEST721'
    }
  }, {
    blockNumber: 16126,
    expected: {
      contractInterfaces: ['ERC20'],
      name: 'CuhToken',
      symbol: 'CUH',
      decimals: '0x12'
    }
  }
]


describe(`# Test tokens`, function () {
  it('should be connected to RSK testnet', async function () {
    let net = await nod3.net.version()
    expect(net.id).to.be.equal('31')
  })
  for (let token of tokens) {
    let { blockNumber, expected } = token
    let { name } = expected
    describe(`## Test token ${name}, block ${blockNumber}`, function () {
      let blockData, contract
      it('get contract data', async function () {
        this.timeout(60000)
        let { db } = await datasource()
        let block = new Block(blockNumber, new BlocksBase(db, { initConfig }))
        await block.fetch()
        blockData = block.getData(true)
        expect(blockData.contracts).to.be.an('array')
        contract = blockData.contracts[0]
      })
      for (let p in expected) {
        it(`${p} should be ${expected[p]}`, () => {
          expect(contract[p]).to.be.deep.equal(expected[p])
        })
      }
    })
  }
})



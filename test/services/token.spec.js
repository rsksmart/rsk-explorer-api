
import { expect } from 'chai'
import Address from '../../src/services/classes/Address'
import { nod3 } from '../../src/lib/nod3Connect'
import initConfig from '../../src/lib/initialConfiguration'

const block = 30000
const tokens = [
  {
    address: '0x1e6d0bad215c6407f552e4d1260e7bae90005ab2',
    expected: {
      contractInterfaces: ['ERC165', 'ERC721', 'ERC721Enumerable', 'ERC721Metadata'],
      name: 'Test721',
      symbol: 'TEST721'
    }
  },
  {
    address: '0xdfcc08e1c61c06ae5229b5f906e0a0e511db6c31',
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
    let { expected, address } = token
    let { name } = expected
    describe(`## Test token ${name}`, function () {
      let data
      it('get contract data', async function () {
        this.timeout(60000)
        let Addr = new Address(address, { nod3, initConfig, block })
        await Addr.fetch()
        data = Addr.getData(true)
        expect(typeof data).to.be.equal('object')
      })
      for (let p in expected) {
        it(`${p} should be ${expected[p]}`, () => {
          expect(data[p]).to.be.deep.equal(expected[p])
        })
      }
    })
  }
})

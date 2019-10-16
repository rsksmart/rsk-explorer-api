import { assert } from 'chai'
import { ContractParser } from '../../src/lib/ContractParser/ContractParser'
import { nod3 } from '../../src/lib/nod3Connect'

const erc165 = [
  '0x4626f072c42afed36d7aad7f2ab9fa9e16bdb72a',
  '0x1e6d0bad215c6407f552e4d1260e7bae90005ab2']

const notErc165 = [
  '0xb08bfbaa77143b2781cf0ab37fce73f3367c8b10',
  '0xb3d6522650ff2057023728443f5a7000df442654',
  '0x29a6d477592d7d1c35c2d3d6ca1eab56aefcac79']

const contracts = erc165.concat(notErc165)
  .reduce((o, v) => {
    o[v] = erc165.includes(v)
    return o
  }, {})

const addresses = {
  '0xebea27d994371cd0cb9896ae4c926bc5221f6317': ['ERC20'],
  '0x0c52e0e76e13ba3e74c5b47f066e20cc152fd9ba': ['ERC20', 'ERC677'],
  '0x4626f072c42afed36d7aad7f2ab9fa9e16bdb72a': ['ERC165', 'ERC721', 'ERC721Enumerable', 'ERC721Metadata'],
  '0x1e6d0bad215c6407f552e4d1260e7bae90005ab2': ['ERC165', 'ERC721', 'ERC721Enumerable', 'ERC721Metadata'],
  '0xe59f2877a51e570fbf751a07d50899838e6b6cc7': ['ERC721'],
  '0x7974f2971e0b5d68f30513615fafec5c451da4d1': ['ERC20', 'ERC677']
}

const parser = new ContractParser()

describe('# Network', function () {
  it('should be connected to RSK testnet', async function () {
    let net = await nod3.net.version()
    console.log(net)
    assert.equal(net.id, '31')
  })
})

describe('# implements ERC165', function () {
  for (let address in contracts) {
    it(`should be ${contracts[address]} ${address}`, async function () {
      let contract = parser.makeContract(address)
      let res = await parser.implementsErc165(contract)
      assert.equal(res, contracts[address])
    })
  }
})

describe('# Interfaces detection', function () {
  for (let address in addresses) {
    it(`${address}: ${addresses[address]}`, async function () {
      this.timeout(60000)
      let contract = parser.makeContract(address)
      const code = await nod3.eth.getCode(address)
      let info = await parser.getContractInfo(code, contract)
      let { interfaces } = info
      assert.includeMembers(interfaces, addresses[address])
    })
  }
})

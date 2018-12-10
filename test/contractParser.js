import { assert } from 'chai'
import { ContractParser } from '../src/lib/ContractParser/ContractParser'
import { nod3 } from '../src/lib/nod3Connect'

const erc165 = [
  '0x2560368d8b6b5d4c05fd8b2d41b90b9286697026',
  '0xfaeaf2d04fa1385c47c4fa083dca536972b085fc',
  '0xb6c7a5fda0ad03c39678e89ee7808529088c963a',
  '0x9046dca7ad4dc4bc34b7a3e654b2079fc3a7c92d']

const notErc165 = [
  '0xb08bfbaa77143b2781cf0ab37fce73f3367c8b10',
  '0xcbcb5f1a49d64022c38269af2e48b5814b076e5b',
  '0x59313581e7d735793962e16b8d0b10636bf53ae7',
  '0xb3d6522650ff2057023728443f5a7000df442654',
  '0x29a6d477592d7d1c35c2d3d6ca1eab56aefcac79']

const contracts = erc165.concat(notErc165)
  .reduce((o, v) => {
    o[v] = erc165.includes(v)
    return o
  }, {})

const addresses = {
  '0xb08bfbaa77143b2781cf0ab37fce73f3367c8b10': ['ERC20'],
  '0x46c717ed9a86de26f11db97e884ae563083dbfe7': ['ERC20', 'ERC667'],
  '0x11944f818fee2c724d4acd1dbc4b4df5dde824f9': ['ERC20'],
  '0x9046dca7ad4dc4bc34b7a3e654b2079fc3a7c92d': ['ERC165', 'ERC721']
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

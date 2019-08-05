
import { expect } from 'chai'
import { Block } from '../../src/services/classes/Block'
import { BlocksBase } from '../../src/lib/BlocksBase'
import { nod3 } from '../../src/lib/nod3Connect'
import datasource from '../../src/lib/dataSource'
import { nativeContracts } from '../shared'

describe('Test token', function () {
  let blockData, contract
  it('should be connected to RSK testnet', async function () {
    let net = await nod3.net.version()
    expect(net.id).to.be.equal('31')
  })
  it(' contract', async function () {
    this.timeout(60000)
    let { db } = await datasource
    let block = new Block(8308, new BlocksBase(db, { nativeContracts }))
    await block.fetch()
    blockData = block.getData(true)
    expect(blockData.contracts).to.be.an('array')
    contract = blockData.contracts[0]
  })

  it('should be an ERC677 token', function () {
    expect(contract.contractInterfaces).includes.members(['ERC165', 'ERC721'])
  })

  it('should be TST token', function () {
    expect(contract.name).to.be.equal('Argentinos Juniors Coin')
    expect(contract.symbol).to.be.equal('ARGJ')
    // expect(contract.totalSupply).to.be.equal('0x10')
  })
})

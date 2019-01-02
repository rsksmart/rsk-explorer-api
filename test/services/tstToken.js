
import { expect } from 'chai'
import { Block } from '../../src/services/classes/Block'
import { BlocksBase } from '../../src/lib/BlocksBase'
import { nod3 } from '../../src/lib/nod3Connect'
import datasource from '../../src/lib/dataSource'

describe('TST token', function () {
  let blockData, contract
  it('should be connected to RSK testnet', async function () {
    let net = await nod3.net.version()
    console.log(net)
    expect(net.id).to.be.equal('31')
  })
  it('should create a contract', async function () {
    this.timeout(60000)
    let db = await datasource
    let block = new Block(22256, new BlocksBase(db))
    await block.fetch()
    blockData = block.getData(true)
    expect(blockData.contracts).to.be.an('array')
    contract = blockData.contracts[0]
  })

  it('should be an ERC677 token', function () {
    expect(contract.contractInterfaces).include.members(['ERC20', 'ERC677'])
  })

  it('should be TST token', function () {
    expect(contract.name).to.be.equal('TST')
    expect(contract.symbol).to.be.equal('TST')
    expect(contract.decimals).to.be.equal('0x12')
    expect(contract.totalSupply).to.be.equal('0x33b2e3c9fd0803ce8000000')
  })
})

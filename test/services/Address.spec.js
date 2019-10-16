import { expect } from 'chai'
import { randomAddress, randomBlockHash, testCollections } from '../shared'
import { fields, addrTypes } from '../../src/lib/types'
import Address from '../../src/services/classes/Address'
import initConfig from '../../src/lib/initialConfiguration'

const nativeTestContract = '0x0000000000000000000000000000000001aaaaaa'

const options = { collections: { Addr: null }, initConfig }

describe(`# Address`, function () {
  describe(`address type`, function () {
    const address = new Address(randomAddress(), options)

    it('address type should be account', () => {
      expect(address.getData().type).to.be.equal('account')
    })

    it('address type should be account', () => {
      address.setData('code', '0x0000')
      expect(address.getData().type).to.be.equal('account')
    })

    it('adress type should be contract', () => {
      address.setData('code', '0xa')
      expect(address.getData().type).to.be.equal('contract')
    })
  })

  describe(`lastBlock`, function () {
    const a = randomAddress()
    const address = new Address(a, options)
    let data = address.getData()

    it(`lastBlock should be undefined`, () => {
      expect(data[fields.LAST_BLOCK_MINED]).to.be.equal(undefined)
    })

    const block = {
      number: 12,
      hash: randomBlockHash(),
      miner: a,
      transactions: []
    }
    it(`${fields.LAST_BLOCK_MINED} should be equal to block`, () => {
      address.setBlock(block)
      const data = address.getData()
      expect(data[fields.LAST_BLOCK_MINED]).to.be.deep.equal(block)
    })

    it(`${fields.LAST_BLOCK_MINED} should be block`, () => {
      address.setBlock({ number: 2, hash: randomBlockHash(), miner: a, transactions: [] })
      const data = address.getData()
      expect(data[fields.LAST_BLOCK_MINED]).to.be.deep.equal(block)
    })

    it(`${fields.LAST_BLOCK_MINED} should be block`, () => {
      address.setBlock({ number: 200, hash: randomBlockHash(), miner: randomAddress(), transactions: [] })
      const data = address.getData()
      expect(data[fields.LAST_BLOCK_MINED]).to.be.deep.equal(block)
    })

    it(`${fields.LAST_BLOCK_MINED} should be block`, () => {
      const test = { number: 200, hash: randomBlockHash(), miner: a, transactions: [] }
      address.setBlock(test)
      const data = address.getData()
      expect(data[fields.LAST_BLOCK_MINED]).to.be.deep.equal(test)
    })
  })
})

describe(`# Address, requires db connection`, function () {

  const a = randomAddress()
  let block = {
    number: 10,
    hash: randomBlockHash(),
    miner: a,
    transactions: []
  }
  const nod3 = {
    eth: {
      async getCode () {
        return null
      },
      async getBalance (address) {
        return '0x01'
      }
    }
  }
  const options2 = { nod3, initConfig }
  const lastBlockMined = fields.LAST_BLOCK_MINED

  it(`should set ${lastBlockMined} and save the address`, async () => {
    options2.collections = await testCollections()
    const address = new Address(a, options2)
    address.setBlock(block)
    expect(address.getData()[lastBlockMined].number).to.be.equal(block.number)
    await address.save()
  })

  it(`${lastBlockMined} should be the highest block mined`, async () => {
    options2.collections = await testCollections()
    const address = new Address(a, options2)
    await address.fetch()
    expect(address.getData()[lastBlockMined].number).to.be.equal(block.number)
    block.number = 14
    address.setBlock(block)
    await address.fetch()
    expect(address.getData()[lastBlockMined].number).to.be.equal(14)
    await address.save()
  })

  it(`${lastBlockMined} should not be replaced by a lower block`, async () => {
    options2.collections = await testCollections()
    const address = new Address(a, options2)
    await address.fetch()
    expect(address.getData()[lastBlockMined].number).to.be.equal(block.number)
    block.number = 10
    address.setBlock(block)
    await address.fetch()
    const data = address.getData()
    expect(address.block, 'block number').to.be.equal(block.number)
    expect(data[lastBlockMined].number).to.be.equal(14)
  })

  it(`${lastBlockMined} should be replaced by a higher block`, async () => {
    options2.collections = await testCollections()
    const address = new Address(a, options2)
    block.number = 300
    address.setBlock(block)
    await address.fetch()
    const data = address.getData()
    expect(address.block).to.be.equal(block.number)
    expect(data[lastBlockMined].number).to.be.equal(block.number)
  })

  it(`should return a native contract address document`, async () => {
    const collections = await testCollections()

    const address = new Address(nativeTestContract, { collections, nod3, initConfig: { nativeContracts: { nativeTestContract } } })
    await address.fetch()
    const data = address.getData()
    expect(data).haveOwnProperty('isNative').equal(true)
    expect(data.type).to.be.equal(addrTypes.CONTRACT)
    expect(data.name).to.be.equal('nativeTestContract')
  })
})

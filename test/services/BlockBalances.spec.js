import { BlockBalances } from '../../src/services/classes/BlockBalances'
import { expect, assert } from 'chai'
import { randomBlockHash, testCollections, fakeAddress, randomTimestamp } from '../shared'

const fakeBalance = address => `0x${address.slice(-4)}`
const nod3 = {
  eth: {
    async getBalance (address) {
      return fakeBalance(address)
    }
  }
}
const createAddreses = (number) => {
  number = number || 2000
  let hash = randomBlockHash()
  let timestamp = randomTimestamp({ unix: true })
  let block = { hash, number, timestamp }
  let addresses = [...Array(10)].map(() => fakeAddress())
  return { block, addresses }
}

const initConfig = {}

describe('BlockBalances', function () {
  it('should return the block address balances', async () => {
    const collections = await testCollections(true)
    let { block, addresses } = createAddreses()
    let blockBalances = new BlockBalances({ block, addresses }, { nod3, collections, initConfig })
    expect(blockBalances).to.be.an('object')
    expect(blockBalances.fetch).to.be.a('function')
    let balances = await blockBalances.fetch()
    expect(balances).to.be.an('array')
    expect(balances.length).to.be.equal(addresses.length)
    testBalances(balances, block, addresses)
  })
  it('should save the balances', async () => {
    await saveBalancesAndTest(createAddreses())
  })

  it('should update the block balances', async () => {
    const collections = await testCollections(true)
    let { block, addresses } = createAddreses()
    await saveBalancesAndTest({ block, addresses }, collections)
    block.number = block.number + 10
    await saveBalancesAndTest({ block, addresses }, collections)
  })

  it('should delete the block balances', async () => {
    const collections = await testCollections(true)
    let { block, addresses } = createAddreses()
    let data = createAddreses(block.number + 12)
    await saveBalancesAndTest({ block, addresses }, collections)
    await saveBalancesAndTest(data, collections)
    let blockBalances = new BlockBalances({ block, addresses }, { nod3, collections, initConfig })
    let balances = await collections.Balances.countDocuments()
    assert.equal(balances, data.addresses.length + addresses.length)
    await blockBalances.deleteOldBalances()
    balances = await collections.Balances.countDocuments()
    assert.equal(balances, data.addresses.length)
  })
})

async function saveBalancesAndTest ({ addresses, block }, collections) {
  if (!collections) collections = await testCollections(true)
  let blockBalances = new BlockBalances({ block, addresses }, { nod3, collections, initConfig })
  let { result, ops, insertedIds } = await blockBalances.save()
  expect(result).to.has.ownProperty('ok', 1)
  expect(Object.keys(insertedIds).length).to.be.equal(addresses.length)
  let docs = []
  for (let balance of ops) {
    let { address, blockHash } = balance
    let reg = await blockBalances.collection.find({ address, blockHash }).toArray()
    expect(reg).to.be.an('array')
    expect(reg.length).to.be.equal(1)
    docs.push(reg[0])
  }
  testBalances(docs, block, addresses)
  testBalances(ops, block, addresses)
}

function testBalances (balances, block, addresses) {
  for (let balance of balances) {
    expect(balance).to.be.an('object', 'balance is an object')
    expect(balance).has.ownProperty('address')
    expect(balance).has.ownProperty('timestamp', block.timestamp)
    let address = addresses.find(({ address }) => address === balance.address)
    expect(address.address).to.be.equal(balance.address)
    expect(balance).has.ownProperty('blockHash', block.hash)
    expect(balance).has.ownProperty('blockNumber', block.number)
    expect(balance).has.ownProperty('balance', fakeBalance(balance.address))
  }
}

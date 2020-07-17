import UpdateBlockBalances, { MissingBalances } from '../../src/services/classes/UpdateBlockBalances'
import { assert } from 'chai'
import { testDb, testCollections, randomBlockHash, randomAddress, fakeAddress, randomNumber, randomTimestamp } from '../shared'

let highestBlock = 10
const database = testDb()

const startTime = randomTimestamp({ unix: true })

const blocks = [...Array(highestBlock)].map((x, number) => {
  let hash = randomBlockHash()
  ++number
  let timestamp = startTime + number * 30
  return {
    hash, number, blockHash: hash, timestamp
  }
})

const fakeAction = () => {
  const from = fakeAddress().address
  const to = fakeAddress().address
  const value = '0x' + randomNumber(undefined, 0).toString(16)
  return { from, to, value }
}

const summaries = blocks.map(block => {
  let { hash, number } = block
  let internalTransactions = [...Array(randomNumber(10, 2))].map(() => { return { action: fakeAction() } })
  let data = { block, internalTransactions }
  return { hash, number, data }
})

const fakeBalance = hash => `0x${hash.slice(-4)}`
const nod3 = {
  eth: {
    async getBalance (address) {
      return fakeBalance(address)
    }
  }
}

describe('MissingBalances', function () {
  this.timeout(10000)
  let lowestBlock = 1
  it('should create a missing balance generator', async () => {
    await database.dropDb()
    let collections = await testCollections(true)
    let { Blocks, Balances } = collections
    await insert(blocks, Blocks)
    let firstBalance = 3
    let lastBalance = 5
    const addresses = blocks.slice(firstBalance, lastBalance).map(balance => {
      balance.address = randomAddress()
      return balance
    })
    await insert(addresses, Balances)
    let mb = await MissingBalances(Blocks, Balances)
    assert.typeOf(mb, 'object')
    assert.typeOf(mb.next, 'function')
    assert.typeOf(mb.current, 'function')
    assert.equal(mb.current(), highestBlock)
    let next = await mb.next()
    assert.equal(next.number, --highestBlock)
    for (let i = next.number - 1; i > lastBalance; i--) {
      next = await mb.next()
      assert.equal(next.number, i)
    }
    assert.equal(next.number, lastBalance + 1)
    assert.equal(mb.current(), next.number)

    for (let i = firstBalance; i >= lowestBlock; i--) {
      next = await mb.next()
      assert.equal(next.number, i)
    }
    next = await mb.next()
    assert.equal(next, undefined)
  })
})

describe('UpdateBlockBalances', function () {
  this.timeout(10000)
  describe('constructor', function () {
    it('should crate a instance', async () => {
      let db = await database.getDb()
      let updateBalances = new UpdateBlockBalances(db, { nod3, initConfig: {} })
      assert.typeOf(updateBalances, 'object')
      assert.deepEqual(updateBalances.lastBlock, { number: undefined })
    })
  })

  /*  describe('start', function () {
   }) */

  describe('updateLastBlock', function () {
    it('should update the lastBlock', async () => {
      let db = await database.getDb()
      let collections = await testCollections(true, database)
      const { Blocks, BlocksSummary } = collections
      await insert(blocks, Blocks)
      await insert(summaries, BlocksSummary)
      let updateBalances = new UpdateBlockBalances(db, { nod3, initConfig: {} })
      assert.deepEqual(updateBalances.lastBlock, { number: undefined })
      let newBlock = blocks[blocks.length - 1]
      let res = await updateBalances.updateLastBlock(newBlock, true)
      assert.isTrue(res)
      assert.deepEqual(updateBalances.lastBlock, newBlock)
    })
  })

  describe('updateBalance', function () {
    let summary = summaries[0]
    let logCreated
    let balanceCreated
    it('should update a block balance', async () => {
      let db = await database.getDb()
      let collections = await testCollections(true, database)
      const { Balances, BlocksSummary } = collections
      await insert(summaries, BlocksSummary)
      let total = await collections.Balances.countDocuments()
      assert.equal(total, 0)
      let updateBalances = new UpdateBlockBalances(db, { nod3, initConfig: {} })
      let { hash: blockHash } = summary
      await updateBalances.updateBalance(blockHash)
      const balance = await Balances.findOne({ blockHash })
      assert.typeOf(balance, 'object')
      assert(balance.balance, fakeBalance(blockHash))
      assert.property(balance, '_created')
      assert.isTrue(balance._created < Date.now())
      balanceCreated = balance._created
    })
    it(`should create a logBalance`, async () => {
      let collections = await testCollections(false, database)
      let logs = await collections.BalancesLog.find({}).toArray()
      assert.isArray(logs)
      assert.isTrue(logs.length === 1)
      let log = logs[0]
      assert.equal(log.blockHash, summary.hash)
      assert.property(log, '_created')
      assert.isTrue(log._created < Date.now())
      logCreated = log._created
    })
    it('logged blocks should be skipped', async () => {
      let db = await database.getDb()
      let collections = await testCollections(false, database)
      const { Balances } = collections
      let updateBalances = new UpdateBlockBalances(db, { nod3, initConfig: {} })
      let { hash: blockHash } = summary
      await updateBalances.updateBalance(blockHash)
      const balance = await Balances.findOne({ blockHash })
      assert.typeOf(balance, 'object')
      assert(balance.balance, fakeBalance(blockHash))
      assert.equal(balance._created, balanceCreated)
      let log = await collections.BalancesLog.findOne({ blockHash })
      assert.propertyVal(log, 'blockHash', blockHash)
      assert.propertyVal(log, '_created', logCreated)
    })
  })
})

async function insert (docs, collection) {
  try {
    let { result } = await collection.insertMany([...docs])
    if (result.ok !== 1 || result.n !== docs.length) {
      throw new Error(`Error inserting docs in ${collection.namespace}`)
    }
    let total = await collection.countDocuments()
    assert.equal(total, docs.length)
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

import { getTxOrEventId } from '../../src/lib/ids'
import { fakeBlocks, fakeTx, testCollections, randomNumber } from '../shared'
import { assert } from 'chai'

const blocks = fakeBlocks(20)

const txs = blocks.reduce((v, block, i) => {
  let total = randomNumber(20)
  for (let n = 0; n <= total; n++) {
    let tx = fakeTx(n, block)
    tx._id = getTxOrEventId(tx)
    let logs = randomNumber(50)
    tx.receipt = {}
    tx.receipt.logs = [...new Array(logs)].map((l, logIndex) => {
      let { blockHash, blockNumber, transactionIndex } = tx
      let event = { logIndex, blockHash, blockNumber, transactionIndex }
      event._id = getTxOrEventId(event)
      return event
    })
    v.push(tx)
  }
  return v
}, [])

const events = txs.reduce((v, a, i) => {
  a.receipt.logs.forEach(e => { v.push(e) })
  return v
}, [])

describe('# txs ids', () => {
  let sortedById, sorted
  let collectionName = 'Txs'
  it(`store ${txs.length} txs in the db`, async function () {
    let time = txs.length * 2000
    this.timeout(time); // <- mocha needs this semicolon
    ({ sorted, sortedById } = await storeAndSort(collectionName, txs, { blockNumber: 1, transactionIndex: 1 }))
  })

  it('compare sorts', () => {
    sortedById.forEach((stx, i) => {
      assert.deepEqual(sorted[i], stx)
    })
  })
})

describe('# events ids', () => {
  let sortedById, sorted
  let collectionName = 'Events'
  it(`store ${events.length} events in the db`, async function () {
    let time = events.length * 2000
    this.timeout(time);
    ({ sorted, sortedById } = await storeAndSort(collectionName, events, { blockNumber: 1, transactionIndex: 1, logIndex: 1 }))
  })

  it('compare sorts', () => {
    sortedById.forEach((stx, i) => {
      assert.deepEqual(sorted[i], stx)
    })
  })
})

async function storeAndSort (collectionName, data, sort) {
  try {
    const collections = await testCollections(true)
    const coll = collections[collectionName]
    await coll.dropIndexes()
    await coll.deleteMany({})
    await coll.insertMany(data, { ordered: true })
    let sortedById = await coll.find({}).sort({ _id: 1 }).toArray()
    let sorted = await coll.find({}).sort(sort).toArray()
    return { sorted, sortedById }
  } catch (err) {
    console.log(err)
    process.exit(9)
  }
}

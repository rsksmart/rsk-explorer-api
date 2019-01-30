import { getTxOrEventId } from '../../src/lib/txFormat'
import DB from '../../src/lib/Db'
import config from '../../src/lib/config'
import { fakeBlocks, fakeTx } from '../shared'
import { assert } from 'chai'

const dbConf = Object.assign(config.db, { database: 'dbToTest' })
const dataBase = new DB(dbConf)
const blocks = fakeBlocks(20)

const txs = blocks.reduce((v, block, i) => {
  let total = Math.floor(Math.random() * 20)
  for (let n = 0; n <= total; n++) {
    let tx = fakeTx(n, block)
    tx._id = getTxOrEventId(tx)
    let logs = Math.floor(Math.random() * 50)
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
  let collectionName = 'transactions'
  it(`store ${txs.length} txs in the db`, async function () {
    let time = txs.length * 2000
    this.timeout(time);
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
  let collectionName = 'events'
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
    let db = await dataBase.db()
    let coll = db.collection(collectionName)
    await db.dropCollection(collectionName)
    await coll.insertMany(data, { ordered: true })
    let sortedById = await coll.find({}).sort({ _id: 1 }).toArray()
    let sorted = await coll.find({}).sort(sort).toArray()
    return { sorted, sortedById }
  } catch (err) {
    console.log(err)
    process.exit(9)
  }
}

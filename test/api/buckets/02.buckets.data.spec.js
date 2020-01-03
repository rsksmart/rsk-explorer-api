import { testDb } from '../../shared'
import { assert } from 'chai'
import { generateBucketQuery, isLastBucket } from '../../../src/api/lib/DataCollector/buckets'

const database = testDb({ dbName: 'bucketsTest' })
const collectionName = 'blocksStats'
const total = 10 ** 4
const avgTime = 30
const timeVar = 10
let time = Math.floor(Date.now() / 1000)

const testData = [...new Array(total)].map((v, i) => {
  time += Math.floor(Math.random() * timeVar) + avgTime
  return { number: i, time }
})

describe('# Buckets data', function () {
  this.timeout(20000)
  let collection
  let output = {
    numbers: { $push: '$number' },
    times: { $push: '$time' }
  }

  it(`should insert ${total} regs in the db`, async function () {
    await database.dropDb()
    let db = await database.getDb()
    collection = db.collection(collectionName)
    let docs = await collection.countDocuments()
    assert.equal(docs, 0)
    let res = await collection.insertMany(testData)
    assert.equal(total, res.insertedCount)
  })

  // One bucket
  it('should get one bucket', async () => {
    let bucketSize = 10
    let result = await getBuckets(collection, 'number', { bucketSize, startValue: 0, endValue: 10 })
    assert.equal(Array.isArray(result), true, 'The result must be an array')
    assert.equal(result.length, 1)
    testBucketProperties(result[0])
  })

  // Bucket output
  it('should get one bucket that match with output', async () => {
    let bucketSize = 10
    let result = await getBuckets(collection, 'number', { bucketSize, startValue: 0, endValue: 10, output })
    assert.equal(Array.isArray(result), true, 'The result must be an array')
    assert.equal(result.length, 1)
    let bucket = result[0]
    testBucketProperties(bucket, output)
    assert.equal(bucket.numbers.length, bucketSize)
    assert.deepEqual(bucket.numbers, testData.filter(d => d.number < bucketSize).map(d => d.number))
  })
  let bucketSize = 99
  let size = Math.ceil(total / bucketSize)

  // Buckets
  it(`should get ${size} buckets`, async () => {
    let result = await getBuckets(collection, 'number', { bucketSize, startValue: 0, endValue: total, output })
    assert.equal(Array.isArray(result), true, 'The result must be an array')
    assert.equal(result.length, size)
    for (let bucket of result) {
      testBucketProperties(bucket, output)
    }
  })
})

function getBuckets (collection, field, options) {
  let query = generateBucketQuery(field, options)
  return collection.aggregate(query).toArray()
}

function testBucketProperties (bucket, output) {
  let properties = (output) ? Object.keys(output) : ['count']
  for (let p of properties) {
    assert.property(bucket, p)
  }
}

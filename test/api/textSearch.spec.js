import { testDb } from '../shared'
import { assert } from 'chai'
import { generateTextQuery } from '../../src/api/lib/DataCollector/textSearch'

const database = testDb({ dbName: 'textSearchTest' })
const collectionName = 'blocksStats'

const testData = ['foo', 'bar', 'baz', 'boss', 'boss foo', 'BAR'].map(name => { return { name, test: 'test' } })

describe(`# Text Search`, function () {
  this.timeout(20000)
  let collection

  it(`should create collection and insert data`, async function () {
    await database.dropDb()
    let db = await database.getDb()
    collection = db.collection(collectionName)
    await collection.createIndex({ name: 'text', description: 'text' })
    // insert data
    await collection.insertMany(testData)
    let docs = await collection.countDocuments()
    assert.equal(docs, testData.length)
  })

  describe(`string`, function () {
    let tests = [
      ['b', ['bar', 'baz', 'boss', 'boss foo', 'BAR']],
      ['ba', ['bar', 'baz', 'BAR']],
      ['bo', ['boss', 'boss foo']],
      ['boss ', ['boss foo']],
      ['f', ['foo', 'boss foo']],
      ['foo', ['foo', 'boss foo']],
      ['bar', ['bar', 'BAR']]
    ]
    let field = 'name'
    describe('Case sensitive', function () {
      for (let test of tests) {
        let [key, expected] = test
        expected = expected.filter(w => !/[A-Z]/.test(w))
        it(`"${key}" should return ${expected}`, async () => {
          let query = generateTextQuery(key, { field, matchCase: true })
          let result = await collection.find(query).toArray()
          assert.deepEqual(result.map(r => r.name), expected)
        })
      }
    })
    describe('Case insensitive', function () {
      for (let test of tests) {
        let [key, expected] = test
        it(`"${key}" should return ${expected}`, async () => {
          let query = generateTextQuery(key, { field })
          let result = await collection.find(query).toArray()
          assert.deepEqual(result.map(r => r.name), expected)
        })
      }
    })
  })
  describe(`full text`, function () {
    let tests = [
      ['boss ', ['boss', 'boss foo']],
      ['foo', ['foo', 'boss foo']],
      ['bar', ['bar', 'BAR']]
    ]
    for (let test of tests) {
      let [key, expected] = test
      it(`"${key}" should return ${expected}`, async () => {
        let query = generateTextQuery(key)
        let result = await collection.find(query).toArray()
        assert.deepEqual(result.map(r => r.name).sort(), expected.sort())
      })
    }
  })
})

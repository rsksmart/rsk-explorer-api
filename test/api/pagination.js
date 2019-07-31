import DB from '../../src/lib/Db'
import DataCollectorItem from '../../src/api/lib/DataCollector/DataCollectorItem'
import { serialize } from '../../src/lib/utils'
import config from '../../src/lib/config'
import { assert } from 'chai'

const dbConf = Object.assign(config.db, { database: 'paginationTest' })
const dataBase = new DB(dbConf)
const collectionName = 'pagination'
const total = 100
const testData = [...new Array(total)].map((v, i) => { return { number: i + 1 } })
const limit = 10
const params = { limit, count: true }

describe('# Pagination', () => {
  let db, collection, collector, storedData, data, pages, field

  it(`should insert ${total} regs in the db`, async function () {
    db = await dataBase.db()
    collection = db.collection(collectionName)
    collector = new DataCollectorItem(collection, null, null)
    field = collector.cursorField
    await collection.deleteMany({})
    let res = await collection.insertMany(testData)
    assert.equal(total, res.insertedCount)
  })

  it(`should get data from db`, async function () {
    storedData = await collection.find({}).sort({ _id: -1 }).toArray()
    storedData = serialize(storedData)
    assert.equal(total, storedData[0].number)
  })

  it(`should return a doc with selected properies`, async () => {
    const test = testData[0]
    const { _id } = test
    const { data } = await collector.getOne({ _id }, { number: 0 })
    assert.deepEqual(data._id, _id)
    assert.isUndefined(data.number)
  })

  it('should return data and pagination data', async function () {
    ({ data, pages } = await getResult(collector, params))
    assert.isArray(data)
    assert.containsAllKeys(pages, ['sort',
      'sortable', 'defaultSort', 'sortDir',
      'limit', 'next', 'prev',
      'total'], 'pages keys')
  })
  it('Test #1 page results', async function () {
    assert.equal(total, pages.total, 'pages.total must be equal to total')
    assert.equal(total, data[0].number, 'First item')
    assert.equal(pages.next, storedData[limit - 1][field], 'next')
    assert.equal(pages.prev, null, 'previous must be undefined')
    if (pages.next) {
      params.next = pages.next
      testPages(collector, params, data)
    }
  })
})

function testPages (collector, params, prevData) {
  describe(`Get results from ${params.next}`, function () {
    it('Checks results', async function () {
      let { pages, data } = await getResult(collector, params)
      let { next, prev } = pages
      assert.typeOf(data, 'array', 'data must be an array')
      assert.equal(data[0].number + limit, prevData[0].number)

      if (next) {
        params.next = next
        testPages(collector, params, data)
      } else {
        assert.equal(data[data.length - 1].number, 1, 'last number must be 1')
      }
    })
  })
}

async function getResult (collector, params, query = {}) {
  try {
    let result = await collector.getPageData({}, params)
    let data = serialize(result.data)
    let pages = serialize(result.pages)
    return { pages, data }
  } catch (err) {
    console.log(err)
  }
}

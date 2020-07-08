import { testDb, isRejected } from './shared'
import { StoredConfig, readOnlyError } from '../src/lib/StoredConfig'
import { expect } from 'chai'

const dataBase = testDb()

const config = () => { return { test: 'test' } }
const testData = () => { return { test: 'testData' } }

const RO_ID = 'testROId'
const TEST_ID = 'testID'
const readOnly = [RO_ID]

describe(`Stored config`, function () {
  let db, storedConfig

  before(async function () {
    await dataBase.dropDb()
    db = await dataBase.getDb()
    storedConfig = StoredConfig(db, readOnly)
  })

  it(`should store a config doc`, async () => {
    await dataBase.dropDb()
    let res = await storedConfig.save(RO_ID, config())
    expect(res).to.haveOwnProperty('result')
    expect(res.result).to.haveOwnProperty('ok').equal(1)
    expect(res).to.haveOwnProperty('insertedCount').equal(1)
  })

  it(`the doc should be read only`, async () => {
    let error = await isRejected(storedConfig.save(RO_ID, config))
    expect(error).to.throw(readOnlyError(RO_ID))
  })

  it(`should return stored doc`, async () => {
    const res = await storedConfig.get(RO_ID)
    expect(res).to.be.deep.equal(config())
  })

  it(`should create a new config doc`, async () => {
    const res = await storedConfig.save(TEST_ID, testData())
    expect(res).to.haveOwnProperty('result')
    expect(res.result).to.haveOwnProperty('ok').equal(1)
    expect(res).to.haveOwnProperty('insertedCount').equal(1)
  })
  it(`should return a doc by id`, async () => {
    const res = await storedConfig.get(TEST_ID)
    expect(res).to.be.deep.equal(testData())
  })

  it(`should update a doc`, async () => {
    const test = testData()
    test.test = 'hello'
    const res = await storedConfig.update(TEST_ID, test)
    expect(res).to.haveOwnProperty('result')
    expect(res.result).to.haveOwnProperty('ok').equal(1)
    expect(res.result).to.haveOwnProperty('nModified').equal(1)
    const stored = await storedConfig.get(TEST_ID)
    expect(stored).to.be.deep.equal(test)
  })
})

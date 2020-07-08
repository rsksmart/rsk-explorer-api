import { testDb } from './shared'
import StoredConfig from '../src/lib/StoredConfig'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)

const { expect } = chai

const dataBase = testDb()

const config = () => { return { test: 'test' } }
const testId = 'testId'
const testData = () => { return { test: 'testData' } }

const ID = 'testID'
const readOnly = [ID]

describe(`Stored config`, function () {
  let db, storedConfig

  before(async function () {
    db = await dataBase.getDb()
    storedConfig = StoredConfig(db)
  })

  it(`should store a config doc`, async () => {
    await dataBase.dropDb()
    let res = await storedConfig.save(ID, config())
    expect(res).to.haveOwnProperty('result')
    expect(res.result).to.haveOwnProperty('ok').equal(1)
    expect(res).to.haveOwnProperty('insertedCount').equal(1)
  })

  it(`the doc should be read only`, async () => {
    expect(storedConfig.save(ID, config)).to.be.rejectedWith()
  })

  it(`should return stored doc`, async () => {
    const res = await storedConfig.get(ID)
    expect(res).to.be.deep.equal(config())
  })
  it(`should create a new config doc`, async () => {
    const res = await storedConfig.save(testId, testData())
    expect(res).to.haveOwnProperty('result')
    expect(res.result).to.haveOwnProperty('ok').equal(1)
    expect(res).to.haveOwnProperty('insertedCount').equal(1)
  })
  it(`should return a doc by id`, async () => {
    const res = await storedConfig.get(testId)
    expect(res).to.be.deep.equal(testData())
  })

  it(`should update a doc`, async () => {
    const test = testData()
    test.test = 'hello'
    const res = await storedConfig.update(testId, test)
    expect(res).to.haveOwnProperty('result')
    expect(res.result).to.haveOwnProperty('ok').equal(1)
    expect(res.result).to.haveOwnProperty('nModified').equal(1)
    const stored = await storedConfig.get(testId)
    expect(stored).to.be.deep.equal(test)
  })
})

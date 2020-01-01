import { testDb } from '../shared'
import Api from '../../src/api/Api'
import { createConfig } from '../../src/lib/config'
import initConfig from '../../src/lib/initialConfiguration'
import { expect } from 'chai'
const dataBase = testDb()
const config = createConfig()

describe(`# API`, function () {
  let db, api
  let newBlocksEvents = []

  before(async function () {
    await dataBase.dropDb()
    db = await dataBase.getDb()
    api = new Api({ db, initConfig }, config.api)
    api.events.on('newBlocks', (data) => {
      newBlocksEvents.push(data)
    })
  })

  it(`api.getLastBlocks() should return a well formed object`, () => {
    testDataObject(api.getLastBlocks())
  })

  it(`api.getLastTransactions() should return a well formed object`, () => {
    testDataObject(api.getLastTransactions())
  })

  it('insert blocks', async () => {
    let block = { number: 0, hash: 0 }
    await api.collections.Blocks.insertOne(block)
    await api.setLastBlocks()
    let lb = api.getLastBlocks()
    api.tick()
    expect(lb.data.data.length).to.be.equal(1)
    expect(lb.data.data[0]).to.be.deep.equal(block)
    // expect(newBlocksEvents.length).to.be.equal(1)
  })
})

function testDataObject (obj) {
  expect(typeof obj).to.be.equal('object')
  expect(obj).to.haveOwnProperty('data')
  let { data } = obj
  expect(data.data).to.be.deep.equal([])
}

import { expect } from 'chai'
import { dataSource } from '../src/lib/dataSource'

describe('Test DB connection', () => {
  it('should connect to db', async () => {
    let { db } = await dataSource({ skipCheck: true })
    expect(db).haveOwnProperty('s')
    expect(db.collection).to.be.a('function')
  })
})

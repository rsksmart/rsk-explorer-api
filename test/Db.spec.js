import { assert } from 'chai'
import { Db } from '../src/lib/Db'
import { MongoClient, Db as MongoDb, Collection } from 'mongodb'

const dbName = 'fooDb'
let db
const collections = {
  Col1: {
    indexes: [
      { key: { number: -1 }, unique: true, name: 'Number' },
      { key: { name: 1 }, name: 'Name' }
    ]
  },
  Col2: {
    indexes: [
      { key: { field: 1 }, unique: true }
    ]
  }
}

describe('Db', function () {
  describe('constructor', function () {
    it('empty name should throw an error', () => {
      assert.throw(() => new Db())
    })
    it('should create a Db instance', () => {
      db = new Db({ db: dbName })
      assert.typeOf(db, 'object')
    })
    it('log should be defined', () => {
      assert.typeOf(db.log, 'object')
      assert.typeOf(db.log.trace, 'function')
      assert.typeOf(db.log.debug, 'function')
      assert.typeOf(db.log.error, 'function')
      assert.typeOf(db.log.warn, 'function')
    })
  })
  describe('connect', function () {
    it('should return a MongoClient instance', async () => {
      db = new Db({ db: dbName })
      let client = await db.connect()
      assert.instanceOf(client, MongoClient)
    })
  })
  describe('db', function () {
    it('should return a MongoDb instance', async () => {
      let mdb = await db.db()
      assert.instanceOf(mdb, MongoDb)
    })
  })
  describe('setLogger', function () {
    it('should set the logger', () => {
      db.setLogger(true)
      assert.equal(db.log, true)
      db.setLogger(console)
    })
  })
  describe('createCollection', function () {

    it('empty collection name should throw an error', async () => {
      let d = await db.db()
      await d.dropDatabase()
      let res = await db.createCollection().catch(err => err)
      assert.instanceOf(res, Error)
    })

    it('should return an instance od MongoDb Collection', async () => {
      let collectionName = 'testCollection'
      let collection = await db.createCollection(collectionName)
      assert.instanceOf(collection, Collection)
    })

    it('should create an indexed collection', async () => {
      let name = 'Col1'
      let collection = await db.createCollection(name, collections[name])
      assert.instanceOf(collection, Collection)
      let indexes = await collection.indexes()
      assert.equal(indexes.length, collections[name].indexes.length + 1)
      assert.includeMembers(indexes.map(i => i.name), collections[name].indexes.map(i => i.name))
    })

    it('should create remove the collection indexes', async () => {
      let name = 'Col1'
      let collection = await db.createCollection(name, {}, { dropIndexes: true })
      assert.instanceOf(collection, Collection)
      let indexes = await collection.indexes()
      assert.equal(indexes.length, 1)
    })
  })

  describe('createCollections', function () {
    it('should create two collections', async () => {
      let cols = await db.createCollections(collections)
      assert.isArray(cols)
      assert.equal(cols.length, 2)
      assert.deepEqual(cols.map(c => c instanceof Collection), [true, true])
    })
  })
})

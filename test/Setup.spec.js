import { Setup, INIT_ID, COLLECTIONS_ID, CONFIG_ID, networkError } from '../src/lib/Setup'
import { assert } from 'chai'
import { testDb, isRejected } from './shared'
import collections from '../src/lib/collections'
import { getDbBlocksCollections } from '../src/lib/blocksCollections'
import initConfig from '../src/lib/initialConfiguration'
import { Db as MongodbDb } from 'mongodb'

const log = null
const netInfo = { id: 31 }

const nod3 = {
  async isConnected () {
    return true
  },
  net: {
    version: () => netInfo
  }
}

const { dropDb, getDb, config } = testDb()

describe('Setup', function () {
  this.timeout(10000)
  describe('constructor', function () {
    it('should create a Setup instance', async () => {
      await dropDb()
      let setup = await Setup({ log }, { nod3, config })
      assert.typeOf(setup, 'object')
      assert.typeOf(setup.start, 'function')
      assert.typeOf(setup.createHash, 'function')
    })
  })

  describe('start', function () {
    it('should return db, collections and initConfig', async () => {
      await dropDb()
      let setup = await Setup({ log }, { nod3, config, collections })
      const res = await setup.start()
      const db = await getDb()
      const dbCollections = await getDbBlocksCollections(db)
      assert.typeOf(res, 'object')
      assert.instanceOf(res.db, MongodbDb)
      assert.deepEqual(res.db.namespace, db.namespace)
      assert.deepEqual(Object.keys(res.collections), Object.keys(dbCollections))
      assert.deepEqual(res.initConfig, initConfig)
    })

    it('should create all collections indexed', async () => {
      await dropDb()
      let setup = await Setup({ log }, { nod3, config, collections })
      await setup.start()
      const db = await getDb()
      await checkCollections(db, collections)
    })

    it('should store the config to db', async () => {
      await dropDb()
      let setup = await Setup({ log }, { nod3, config, collections })
      const { initConfig, collections: startCollections } = await setup.start()
      const storedInitConfig = await startCollections.Config.findOne({ _id: INIT_ID })
      for (let p in initConfig) {
        assert.deepEqual(initConfig[p], storedInitConfig[p])
      }
      const collectionsConfig = await startCollections.Config.findOne({ _id: COLLECTIONS_ID })
      assert.propertyVal(collectionsConfig, 'hash', setup.createHash(collections))
      const configConfig = await startCollections.Config.findOne({ _id: CONFIG_ID })
      assert.propertyVal(configConfig, 'hash', setup.createHash(config))
    })

    it('if network id changes should throw an error', async () => {
      await dropDb()
      let setup = await Setup({ log }, { nod3, config, collections })
      let { initConfig: storedConfig } = await setup.start()
      const id = netInfo.id
      netInfo.id = id + 1
      setup = await Setup({ log }, { nod3, config, collections })
      let error = await isRejected(setup.start())
      assert.throw(error, networkError(storedConfig, initConfig))
      netInfo.id = id
      await setup.start()
    })

    it('should update collections indexes when it changes', async () => {
      await dropDb()
      let setup = await Setup({ log }, { nod3, config, collections })
      await setup.start()
      const newCollections = Object.assign({}, collections)
      const keys = Object.keys(newCollections)
      let c1 = collections[keys[2]]
      let c2 = collections[keys[3]]
      let indx1 = c1.indexes
      let indx2 = c2.indexes
      c2.indexes = indx1
      c2.indexes = indx2
      setup = await Setup({ log }, { nod3, config, collections })
      const db = await getDb()
      await setup.start()
      await checkCollections(db, newCollections)
    })

    it('should update collections when config changes', async () => {
      await dropDb()
      let setup = await Setup({ log }, { nod3, config, collections })
      let time = Date.now()
      let start = await setup.start()
      let stored = await start.collections.Config.findOne({ _id: CONFIG_ID })
      assert.propertyVal(stored, 'hash', setup.createHash(config))
      assert.property(stored, '_created')
      assert.isTrue(stored._created > time)
      const newConfig = Object.assign({}, config)
      newConfig.test = 'TEST'
      setup = await Setup({ log }, { nod3, config: newConfig, collections })
      start = await setup.start()
      stored = await start.collections.Config.findOne({ _id: CONFIG_ID })
      assert.propertyVal(stored, 'hash', setup.createHash(newConfig))
      assert.property(stored, '_created')
      assert.property(stored, '_updated')
      assert.isTrue(stored._updated > stored._created)
    })

    it('create collections should be skipped when no changes', async () => {
      await dropDb()
      let setup = await Setup({ log: console }, { nod3, config, collections })
      let time = Date.now()
      let start = await setup.start()
      let stored = await start.collections.Config.findOne({ _id: CONFIG_ID })
      assert.propertyVal(stored, 'hash', setup.createHash(config))
      assert.property(stored, '_created')
      assert.isTrue(stored._created > time)
      await setup.start()
      let newValue = await start.collections.Config.findOne({ _id: CONFIG_ID })
      assert.property(newValue, '_created')
      assert.notProperty(newValue, '_updated')
      assert.equal(newValue._created, stored._created)
    })
  })
})

function parseNamespace (dbOrCollection) {
  let { namespace } = dbOrCollection
  let [db, collection] = namespace.split('.')
  return { db, collection }
}

async function getCollections (db) {
  let collections = await db.collections()
  let res = await Promise.all([...collections.map(async (c) => {
    let { db, collection } = parseNamespace(c)
    let indexes = await c.indexes()
    return { db, collection, indexes }
  })])
  return res
}

async function checkCollections (db, collections, collectionsNames) {
  collectionsNames = collectionsNames || config.collectionsNames
  const dbCollections = await getCollections(db)
  assert.equal(dbCollections.length, Object.keys(collectionsNames).length)
  assert.includeMembers(Object.values(collectionsNames), dbCollections.map(({ collection }) => collection), 'All collections should be created')
  for (let key in collectionsNames) {
    let name = collectionsNames[key]
    let indexes = collections[key].indexes
    let collection = await db.collection(name)
    if (indexes.length) {
      let res = await collection.createIndexes(indexes)
      assert.equal(res.ok, 1)
      assert.equal(res.numIndexesBefore, res.numIndexesAfter)
      assert.equal(res.note, 'all indexes already exist') // review in future mongo version
    }
  }
}

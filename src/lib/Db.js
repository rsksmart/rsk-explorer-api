import { MongoClient } from 'mongodb'

export class Db {
  constructor (config) {
    config = config || {}
    this.server = config.server || 'localhost'
    this.port = config.port || 27017
    this.dbName = config.database || config.db
    if (!this.dbName) throw new Error('Missing database name')
    const user = config.user
    const password = config.password
    let url = 'mongodb://'
    if (user && password) url += `${user}:${password}@`
    url += `${this.server}:${this.port}/${this.dbName}`
    this.url = url
    this.client = null
    this.log = config.Logger || console
    this.connect()
  }
  connect () {
    if (!this.client) this.client = MongoClient.connect(this.url, { useNewUrlParser: true, useUnifiedTopology: true })
    return this.client
  }

  async db () {
    let client = await this.connect()
    let db = await client.db(this.dbName)
    return db
  }

  setLogger (log) {
    this.log = log
  }

  async createCollection (collectionName, indexes, options) {
    try {
      const db = await this.db()
      if (!collectionName) throw new Error('Invalid collection name')
      let collection = db.collection(collectionName)

      if (options.dropIndexes) {
        this.log.info(`Removing indexes from ${collectionName}`)
        await collection.dropIndexes()
      }
      if (indexes && indexes.length) {
        this.log.info(`Creating indexes to ${collectionName}`)
        await collection.createIndexes(indexes)
      }
      if (options.validate) {
        this.log.info(`Validating collection: ${collectionName}`)
        await db.admin().validateCollection(collectionName)
      }
      return collection
    } catch (err) {
      return Promise.reject(err)
    }
  }

  createCollections (collections, options) {
    let queue = []
    let names = options.names || {}
    for (let c in collections) {
      let name = names[c] || c
      let indexes = collections[c]
      queue.push(this.createCollection(name, indexes, options)
        .then(collection => {
          this.log.info(`Created collection ${name}`)
          return collection
        })
        .catch(err => {
          this.log.error(`Error creating collection ${name} ${err}`)
          return Promise.reject(err)
        })
      )
    }
    return Promise.all(queue)
  }

  insertMsg (insertResult, data, dataType) {
    let count = (data) ? data.length : null
    let msg = ['Inserted', insertResult.result.n]
    if (count) {
      msg.push('of')
      msg.push(count)
    }
    if (dataType) msg.push(dataType)
    return msg.join(' ')
  }
}
export default Db

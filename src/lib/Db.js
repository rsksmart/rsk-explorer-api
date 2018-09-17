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
    if (!this.client) this.client = MongoClient.connect(this.url, { useNewUrlParser: true })
    return this.client
  }

  async db () {
    let client = await this.connect()
    let db = await client.db(this.dbName)
    return db
  }


  async createCollection (collectionName, indexes) {
    const db = await this.db()
    if (!collectionName) return Promise.reject(new Error('Invalid collection name'))
    let collection = db.collection(collectionName)
    if (!indexes || !indexes.length) return Promise.resolve(collection)
    return collection.createIndexes(indexes).then(doc => {
      return db.admin().validateCollection(collectionName).then(() => collection)
    })
  }

  createCollections (collections, config = {}) {
    let queue = []
    for (let c in collections) {
      let name = config[c] || c
      queue.push(this.createCollection(name, collections[c])
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

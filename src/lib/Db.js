import { MongoClient } from 'mongodb'

class Db {
  constructor(server, port, dbName) {
    this.server = server
    this.port = port
    this.dbName = dbName
    this.url = 'mongodb://' + this.server + ':' + this.port + '/' + this.db
    this.client = null

    this.connect = function () {
      if (!this.client) this.client = MongoClient.connect(this.url)
      return this.client
    }

    this.db = async function () {
      let client = await this.connect()
      let db = await client.db(this.dbName)
      return db
    }


    this.connect()
  }
}
export function indexesError (collectionName) {
  console.log('Error creating' + collectionName + 'indexes')
  process.exit(9)
}

export function createCollection (db, collectionName, indexes) {
  let collection = db.collection(collectionName)
  return collection.createIndexes(indexes).then(doc => {
    if (!doc.ok) indexesError(collectionName)
    return collection
  })
}

export default Db
